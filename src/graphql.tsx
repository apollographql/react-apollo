
import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
import isEqual = require('lodash.isequal');
import flatten = require('lodash.flatten');
import shallowEqual from './shallowEqual';

import invariant = require('invariant');
import assign = require('object-assign');

import hoistNonReactStatics = require('hoist-non-react-statics');

import ApolloClient, {
  readQueryFromStore,
} from 'apollo-client';

import {
  createFragmentMap,
} from 'apollo-client/queries/getFromAST';

import {
  ApolloError,
} from 'apollo-client/errors';

import {
  WatchQueryOptions,
} from 'apollo-client/watchQueryOptions';

import {
  ObservableQuery,
} from 'apollo-client/ObservableQuery';

import {
  MutationBehavior,
  MutationQueryReducersMap,
} from 'apollo-client/data/mutationResults';

import {
  Subscription,
} from 'apollo-client/util/Observable';

import {
  ApolloStore,
} from 'apollo-client/store';

import {
  // GraphQLResult,
  Document,
  FragmentDefinition,
} from 'graphql';

import { parser, DocumentType } from './parser';
import { reduxRootSelector } from './apolloClient';

export declare interface MutationOptions {
  variables?: Object;
  resultBehaviors?: MutationBehavior[];
  fragments?: FragmentDefinition[] | FragmentDefinition[][];
  optimisticResponse?: Object;
  updateQueries?: MutationQueryReducersMap;
  forceFetch?: boolean;
}

export declare interface QueryOptions {
  ssr?: boolean;
  variables?: { [key: string]: any };
  forceFetch?: boolean;
  returnPartialData?: boolean;
  noFetch?: boolean;
  pollInterval?: number;
  fragments?: FragmentDefinition[] | FragmentDefinition[][];
  skip?: boolean;
}

const defaultQueryData = {
  loading: true,
  errors: null,
};

const defaultMapPropsToOptions = props => ({});
const defaultMapResultToProps = props => props;

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Helps track hot reloading.
let nextVersion = 0;

export function withApollo(WrappedComponent) {

  const withDisplayName = `withApollo(${getDisplayName(WrappedComponent)})`;

  class WithApollo extends Component<any, any> {
    static displayName = withDisplayName;
    static WrappedComponent = WrappedComponent;
    static contextTypes = { client: PropTypes.object.isRequired };

    // data storage
    private client: ApolloClient; // apollo client

    constructor(props, context) {
      super(props, context);
      this.client = context.client;

      invariant(!!this.client,
          `Could not find "client" in the context of ` +
          `"${withDisplayName}". ` +
          `Wrap the root component in an <ApolloProvider>`
        );

    }


    render() {
      const props = assign({}, this.props);
      props.client = this.client;
      return createElement(WrappedComponent, props);
    }
  }

  // Make sure we preserve any custom statics on the original component.
  return hoistNonReactStatics(WithApollo, WrappedComponent);
};

export interface OperationOption {
  options?: Object | ((props: any) => QueryOptions | MutationOptions);
  props?: (props: any) => any;
  name?: string;
  withRef?: boolean;
}

export default function graphql(
  document: Document,
  operationOptions: OperationOption = {}
) {

  // extract options
  const { options = defaultMapPropsToOptions } = operationOptions;
  let mapPropsToOptions = options as (props: any) => QueryOptions | MutationOptions;
  if (typeof mapPropsToOptions !== 'function') mapPropsToOptions = () => options;

  const mapResultToProps = operationOptions.props;

  // safety check on the operation
  const operation = parser(document);

  // Helps track hot reloading.
  const version = nextVersion++;
  return function wrapWithApolloComponent(WrappedComponent) {

    const graphQLDisplayName = `Apollo(${getDisplayName(WrappedComponent)})`;

    function calculateFragments(fragments): FragmentDefinition[] {
      if (!fragments && !operation.fragments.length) {
        return fragments;
      }

      if (!fragments) {
        return fragments = flatten([...operation.fragments]);
      }

      return flatten([...fragments, ...operation.fragments]);
    }

    function calculateOptions(props, newOpts?) {
      let opts = mapPropsToOptions(props);

      if (newOpts && newOpts.variables) {
        newOpts.variables = assign({}, opts.variables, newOpts.variables);
      }
      if (newOpts) opts = assign({}, opts, newOpts);
      if (opts.variables || !operation.variables.length) return opts;

      let variables = {};
      for (let { variable, type } of operation.variables) {
        if (!variable.name || !variable.name.value) continue;

        if (typeof props[variable.name.value] !== 'undefined') {
          variables[variable.name.value] = props[variable.name.value];
          continue;
        }

        // allow optional props
        if (type.kind !== 'NonNullType') {
          variables[variable.name.value] = null;
          continue;
        }

        invariant(typeof props[variable.name.value] !== 'undefined',
          `The operation '${operation.name}' wrapping '${getDisplayName(WrappedComponent)}' ` +
          `is expecting a variable: '${variable.name.value}' but it was not found in the props ` +
          `passed to '${graphQLDisplayName}'`
        );
      }
      opts.variables = variables;
      return opts;
    }

    function fetchData(props, { client }) {
      if (operation.type === DocumentType.Mutation) return false;
      const opts = calculateOptions(props) as any;
      opts.query = document;

      if (opts.ssr === false) return false;
      if (!opts.variables) delete opts.variables;
      opts.fragments = calculateFragments(opts.fragments);

      // if this query is in the store, don't block execution
      try {
        readQueryFromStore({
          store: reduxRootSelector(client).data,
          query: opts.query,
          variables: opts.variables,
          fragmentMap: createFragmentMap(opts.fragments),
        });
        return false;
      } catch (e) {/* tslint:disable-line */}

      return client.query(opts);
    }


    class GraphQL extends Component<any, any> {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;
      static contextTypes = {
        store: PropTypes.object.isRequired,
        client: PropTypes.object.isRequired,
      };

      // start of query composition
      static fragments: FragmentDefinition[] = operation.fragments;

      // react / redux and react dev tools (HMR) needs
      public props: any; // passed props
      public version: number;
      public hasMounted: boolean;

      // data storage
      private store: ApolloStore;
      private client: ApolloClient; // apollo client
      private data: any = {}; // apollo data
      private type: DocumentType;

      private previousOpts: Object;
      // private previousQueries: Object;

      // request / action storage
      private queryObservable: ObservableQuery | Object;
      private querySubscription: Subscription | Object;

      // calculated switches to control rerenders
      private haveOwnPropsChanged: boolean;
      private hasOperationDataChanged: boolean;

      // the element to render
      private renderedElement: any;

      constructor(props, context) {
        super(props, context);
        this.version = version;
        this.client = context.client;

        invariant(!!this.client,
          `Could not find "client" in the context of ` +
          `"${graphQLDisplayName}". ` +
          `Wrap the root component in an <ApolloProvider>`
        );

        this.store = this.client.store;

        this.type = operation.type;
        this.queryObservable = {};
        this.querySubscription = {};

        this.setInitialProps();

      }

      componentDidMount() {
        this.hasMounted = true;
        if (this.type === DocumentType.Mutation) return;

        this.subscribeToQuery(this.props);

      }

      componentWillReceiveProps(nextProps) {
        if (shallowEqual(this.props, nextProps)) return;

        if (this.type === DocumentType.Mutation) {
          this.createWrappedMutation(nextProps, true);
          return;
        };

        // we got new props, we need to unsubscribe and re-subscribe with the new data
        this.haveOwnPropsChanged = true;
        this.subscribeToQuery(nextProps);
      }

      shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !!nextContext || this.haveOwnPropsChanged || this.hasOperationDataChanged;
      }

      componentWillUnmount() {
        if (this.type === DocumentType.Query) this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      calculateOptions(props, newProps?) { return calculateOptions(props, newProps); };

      calculateResultProps(result) {
        let name = this.type === DocumentType.Query ? 'data' : 'mutate';
        if (operationOptions.name) name = operationOptions.name;

        const newResult = { [name]: result, ownProps: this.props };
        if (mapResultToProps) return mapResultToProps(newResult);

        return { [name]: defaultMapResultToProps(result) };
      }

      setInitialProps() {
        if (this.type === DocumentType.Mutation) {
           this.createWrappedMutation(this.props);
          return;
        }

        const queryOptions = this.calculateOptions(this.props);
        const fragments = calculateFragments(queryOptions.fragments);
        const { variables, forceFetch, skip } = queryOptions as QueryOptions;

        let queryData = assign({}, defaultQueryData) as any;
        queryData.variables = variables;
        if (skip) queryData.loading = false;

        queryData.refetch = (vars) => this.client.query({
          query: document,
          variables: vars,
        });

        queryData.fetchMore = (opts) => {
          opts.query = document;
          return this.client.query(opts);
        };

        // XXX type this better
        // this is a stub for early binding of updateQuery before data
        queryData.updateQuery = (mapFn: any) => {
          invariant(!!(this.queryObservable as ObservableQuery).updateQuery, `
            Update query has been called before query has been created
          `);

          (this.queryObservable as ObservableQuery).updateQuery(mapFn);
        };

        if (!forceFetch) {
          try {
            const result = readQueryFromStore({
              store: reduxRootSelector(this.client).data,
              query: document,
              variables,
              fragmentMap: createFragmentMap(fragments),
            });

            queryData = assign(queryData, { errors: null, loading: false }, result);
          } catch (e) {/* tslint:disable-line */}
        }

        this.data = queryData;
      }

      subscribeToQuery(props): boolean {
        const { watchQuery } = this.client;
        const opts = calculateOptions(props) as QueryOptions;
        if (opts.skip) return;

        // don't rerun if nothing has changed
        if (isEqual(opts, this.previousOpts)) return false;

        // if the only thing that changed was the variables, do a refetch instead of a new query
        const old = assign({}, this.previousOpts) as any;
        const neu = assign({}, opts) as any;
        delete old.variables;
        delete neu.variables;

        if (
          this.previousOpts &&
          (!shallowEqual(opts.variables, (this.previousOpts as WatchQueryOptions).variables)) &&
          (shallowEqual(old, neu))
        ) {
          this.hasOperationDataChanged = true;
          this.data = assign(this.data, { loading: true, variables: opts.variables });
          this.forceRenderChildren();
          (this.queryObservable as ObservableQuery).refetch(assign(
            {}, (this.previousOpts as WatchQueryOptions).variables, opts.variables
          ))
            .then((result) => {
              this.data = assign(this.data, result.data, { loading: false });
              this.hasOperationDataChanged = true;
              this.forceRenderChildren();
              return result;
            })
            .catch(error => {
              this.data = assign(this.data, { loading: false, error });
              this.hasOperationDataChanged = true;
              this.forceRenderChildren();
              return error;
            });
          this.previousOpts = opts;
          return;
        }

        this.previousOpts = opts;

        let previousQuery = this.queryObservable as any;
        this.unsubscribeFromQuery();

        const queryOptions: WatchQueryOptions = assign({ query: document }, opts);
        queryOptions.fragments = calculateFragments(queryOptions.fragments);
        const observableQuery = watchQuery(queryOptions);
        const { queryId } = observableQuery;

        // the shape of the query has changed
        if (previousQuery.queryId && previousQuery.queryId !== queryId) {
          this.data = assign(this.data, { loading: true });
          this.hasOperationDataChanged = true;
          this.forceRenderChildren();
        }

        this.handleQueryData(observableQuery, queryOptions);
      }

      unsubscribeFromQuery() {
        if ((this.querySubscription as Subscription).unsubscribe) {
          (this.querySubscription as Subscription).unsubscribe();
          delete this.queryObservable;
        }
      }

      handleQueryData(observableQuery: ObservableQuery, { variables }: WatchQueryOptions): void {
        // bind each handle to updating and rerendering when data
        // has been recieved
        let refetch,
            fetchMore,
            startPolling,
            stopPolling,
            updateQuery,
            oldData = {};

        const next = ({ data = oldData, loading, error }: any) => {
          const { queryId } = observableQuery;
          let initialVariables = reduxRootSelector(this.client).queries[queryId].variables;

          const resultKeyConflict: boolean = (
            'errors' in data ||
            'loading' in data ||
            'refetch' in data ||
            'fetchMore' in data ||
            'startPolling' in data ||
            'stopPolling' in data ||
            'updateQuery' in data
          );

          invariant(!resultKeyConflict,
            `the result of the '${graphQLDisplayName}' operation contains keys that ` +
            `conflict with the return object. 'errors', 'loading', ` +
            `'startPolling', 'stopPolling', 'fetchMore', 'updateQuery', and 'refetch' cannot be ` +
            `returned keys`
          );

          // only rerender child component if data has changed
          if (!isEqual(oldData, data) || loading !== this.data.loading) {
            this.hasOperationDataChanged = true;
          }

          // cache the changed data for next check
          oldData = assign({}, data);
          this.data = assign({
            variables: this.data.variables || initialVariables,
            loading,
            refetch,
            startPolling,
            stopPolling,
            fetchMore,
            error,
            updateQuery,
          }, data);

          this.forceRenderChildren();
        };

        const createBoundRefetch = (refetchMethod) => (vars, ...args) => {
          let newVariables = vars;
          const newData = { loading: true } as any;
          if (vars && (vars.variables || vars.query || vars.updateQuery)) {
            newVariables = assign({}, this.data.variables, vars.variables);
            newData.variables = newVariables;
          }

          this.data = assign(this.data, newData);

          this.hasOperationDataChanged = true;
          this.forceRenderChildren();
          // XXX why doesn't apollo-client fire next on a refetch with the same data?
          return refetchMethod(vars, ...args)
            .then((result) => {
              if (result && isEqual(result.data, oldData)) next(result);
              return result;
            });
        };

        this.queryObservable = observableQuery;

        const handleError = (error) => {
          if (error instanceof ApolloError) return next({ error });
          throw error;
        };
        /*

          Since `setState()` can throw an error if the child had a render error,
          we can't use the `error` part of the query subscription. If we do, all children
          errors are captured as NetworkErrors which isn't true / helpful.

          Instead, we subscribe to the store for network errors and re-render that way
        */
        this.querySubscription = observableQuery.subscribe({ next, error: handleError });

        refetch = createBoundRefetch((this.queryObservable as any).refetch);
        fetchMore = createBoundRefetch((this.queryObservable as any).fetchMore);
        startPolling = (this.queryObservable as any).startPolling;
        stopPolling = (this.queryObservable as any).stopPolling;
        updateQuery = (this.queryObservable as any).updateQuery;

        // XXX the tests seem to be keeping the error around?
        delete this.data.error;
        this.data = assign(this.data, {
          refetch, startPolling, stopPolling, fetchMore, updateQuery, variables,
        });
      }

      forceRenderChildren() {
        // force a rerender that goes through shouldComponentUpdate
        if (this.hasMounted) this.setState({});
      }

      getWrappedInstance() {
        invariant(operationOptions.withRef,
          `To access the wrapped instance, you need to specify ` +
          `{ withRef: true } in the options`
        );

        return (this.refs as any).wrappedInstance;
      }

      createWrappedMutation(props: any, reRender = false) {
        if (this.type !== DocumentType.Mutation) return;

        this.data = (opts: MutationOptions) => {
          opts = this.calculateOptions(props, opts);

          if (typeof opts.variables === 'undefined') delete opts.variables;

          (opts as any).mutation = document;
          opts.fragments = calculateFragments(opts.fragments);
          return this.client.mutate((opts as any));
        };

        if (!reRender) return;

        this.hasOperationDataChanged = true;
        this.forceRenderChildren();
      }

      render() {
        const { haveOwnPropsChanged, hasOperationDataChanged, renderedElement, props, data } = this;

        this.haveOwnPropsChanged = false;
        this.hasOperationDataChanged = false;

        const clientProps = this.calculateResultProps(data);
        const mergedPropsAndData = assign({}, props, clientProps);

        if (!haveOwnPropsChanged && !hasOperationDataChanged && renderedElement) {
          return renderedElement;
        }

        if (operationOptions.withRef) mergedPropsAndData.ref = 'wrappedInstance';

        this.renderedElement = createElement(WrappedComponent, mergedPropsAndData);
        return this.renderedElement;
      }
    }

    if (operation.type === DocumentType.Query) (GraphQL as any).fetchData = fetchData;

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent);

  };

};
