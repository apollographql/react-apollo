
import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
// import isObject = require('lodash.isobject');
import isEqual = require('lodash.isequal');
import shallowEqual from './shallowEqual';

import invariant = require('invariant');
import assign = require('object-assign');

import hoistNonReactStatics = require('hoist-non-react-statics');

import {
  Store,
} from 'redux';

import ApolloClient, {
  readQueryFromStore,
} from 'apollo-client';

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
  // GraphQLResult,
  Document,
  FragmentDefinition,
} from 'graphql';

import { parser, DocumentType } from './parser';

export declare interface MutationOptions {
  variables?: Object;
  resultBehaviors?: MutationBehavior[];
  fragments?: FragmentDefinition[];
  optimisticResponse?: Object;
  updateQueries?: MutationQueryReducersMap;
}

export declare interface QueryOptions {
  ssr?: boolean;
  variables?: { [key: string]: any };
  forceFetch?: boolean;
  returnPartialData?: boolean;
  noFetch?: boolean;
  pollInterval?: number;
  fragments?: FragmentDefinition[];
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
      this.client = props.client || context.client;

      invariant(!!this.client,
        `Could not find "client" in either the context or ` +
        `props of "${withDisplayName}". ` +
        `Either wrap the root component in an <ApolloProvider>, ` +
        `or explicitly pass "client" as a prop to "${withDisplayName}".`
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
  options?: (props: any) => QueryOptions | MutationOptions;
  props?: (props: any) => any;
  name?: string;
}

export default function graphql(
  document: Document,
  operationOptions: OperationOption = {}
) {

  // extract options
  const { options = defaultMapPropsToOptions } = operationOptions;
  const mapPropsToOptions = options;
  const mapResultToProps = operationOptions.props;

  // safety check on the operation
  const operation = parser(document);

  // Helps track hot reloading.
  const version = nextVersion++;
  return function wrapWithApolloComponent(WrappedComponent) {

    const graphQLDisplayName = `Apollo(${getDisplayName(WrappedComponent)})`;

    function calculateVariables(props) {
      const opts = mapPropsToOptions(props);
      if (opts.variables || !operation.variables.length) return opts.variables;

      let variables = {};
      for (let { variable } of operation.variables) {
        if (!variable.name || !variable.name.value) continue;

        if (typeof props[variable.name.value] !== 'undefined') {
          variables[variable.name.value] = props[variable.name.value];
          continue;
        }

        invariant(typeof props[variable.name.value] !== 'undefined',
          `The operation '${operation.name}' wrapping '${getDisplayName(WrappedComponent)}' ` +
          `is expecting a variable: '${variable.name.value}' but it was not found in the props ` +
          `passed to '${graphQLDisplayName}'`
        );
      }

      return variables;
    }

    function fetchData(props, { client }) {
      if (operation.type === DocumentType.Mutation) return false;
      const opts = mapPropsToOptions(props) as any;
      opts.query = document;

      if (opts.ssr === false) return false;
      if (!opts.variables) opts.variables = calculateVariables(props);
      if (!opts.variables) delete opts.variables;

      // if this query is in the store, don't block execution
      try {
        readQueryFromStore({
          store: client.store.getState()[client.reduxRootKey].data,
          query: opts.query,
          variables: opts.variables,
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
      // for use with getData during SSR
      static fetchData = operation.type === DocumentType.Query ? fetchData : false;

      // react / redux and react dev tools (HMR) needs
      public props: any; // passed props
      public version: number;
      public hasMounted: boolean;

      // data storage
      private store: Store<any>;
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
        this.store = props.store || context.store;
        this.client = props.client || context.client;

        invariant(!!this.client,
          `Could not find "client" in either the context or ` +
          `props of "${graphQLDisplayName}". ` +
          `Either wrap the root component in an <ApolloProvider>, ` +
          `or explicitly pass "client" as a prop to "${graphQLDisplayName}".`
        );

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

      shouldComponentUpdate(nextProps, nextState) {
        return this.haveOwnPropsChanged || this.hasOperationDataChanged;
      }

      componentWillUnmount() {
        if (this.type === DocumentType.Query) this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      calculateVariables(props) { return calculateVariables(props); };

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

        const { reduxRootKey } = this.client;
        const variables = this.calculateVariables(this.props);
        let queryData = defaultQueryData as any;
        queryData.variables = variables;
        try {
          const result = readQueryFromStore({
            store: this.store.getState()[reduxRootKey].data,
            query: document,
            variables,
          });
          queryData = assign({ errors: null, loading: false, variables }, result);
        } catch (e) {/* tslint:disable-line */}

        this.data = queryData;
      }

      subscribeToQuery(props): boolean {
        const { watchQuery } = this.client;
        const opts = mapPropsToOptions(props) as QueryOptions;
        if (opts.skip) return;

        // handle auto merging of variables from props
        opts.variables = this.calculateVariables(props);

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
          ));
          this.previousOpts = opts;
          return;
        }

        this.previousOpts = opts;

        let previousQuery = this.queryObservable as any;
        this.unsubscribeFromQuery();

        const queryOptions: WatchQueryOptions = assign({ query: document }, opts);
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
        const { reduxRootKey } = this.client;
        // bind each handle to updating and rerendering when data
        // has been recieved
        let refetch,
            fetchMore,
            startPolling,
            stopPolling,
            oldData = {};

        const next = ({ data = oldData, loading, error }: any) => {

          // XXX use passed loading after https://github.com/apollostack/apollo-client/pull/467
          const { queryId } = observableQuery;
          const currentVariables = this.store.getState()[reduxRootKey].queries[queryId].variables;
          const resultKeyConflict: boolean = (
            'errors' in data ||
            'loading' in data ||
            'refetch' in data ||
            'fetchMore' in data ||
            'startPolling' in data ||
            'stopPolling' in data
          );

          invariant(!resultKeyConflict,
            `the result of the '${graphQLDisplayName}' operation contains keys that ` +
            `conflict with the return object. 'errors', 'loading', ` +
            `'startPolling', 'stopPolling', 'fetchMore', and 'refetch' cannot be ` +
            `returned keys`
          );

          // only rerender child component if data has changed
          if (!isEqual(oldData, data) || loading !== this.data.loading) {
            this.hasOperationDataChanged = true;
          }

          // cache the changed data for next check
          oldData = assign({}, data);
          this.data = assign({
            variables: currentVariables,
            loading,
            refetch,
            startPolling,
            stopPolling,
            fetchMore,
            error,
          }, data);

          this.forceRenderChildren();
        };

        const createBoundRefetch = (refetchMethod) => (vars, ...args) => {
          let newVariables = vars;
          const newData = { loading: true } as any;
          if (vars && (vars.variables || vars.query || vars.updateQuery)) {
            newVariables = vars.variables;
          }

          if (newVariables) newData.variables = newVariables;
          this.data = assign(this.data, newData);

          this.hasOperationDataChanged = true;
          this.forceRenderChildren();
          // XXX why doesn't apollo-client fire next on a refetch with the same data?
          return refetchMethod(vars, ...args)
            .then((result) => {
              if (isEqual(result.data, oldData)) next(result);
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

        // XXX the tests seem to be keeping the error around?
        delete this.data.error;
        this.data = assign(this.data, { refetch, startPolling, stopPolling, fetchMore, variables });
      }

      forceRenderChildren() {
        // force a rerender that goes through shouldComponentUpdate
        if (this.hasMounted) this.setState({});
      }

      getWrappedInstance() {
        return (this.refs as any).wrappedInstance;
      }

      createWrappedMutation(props: any, reRender = false) {
        if (this.type !== DocumentType.Mutation) return;

        // XXX do we want to do any loading state stuff here?
        this.data = (opts: MutationOptions) => {
          const original = mapPropsToOptions(props);

          // merge variables
          if (original.variables) {
            original.variables = assign({}, original.variables, opts.variables);
          }

          opts = assign({}, original, opts);
          if (!original.variables && !opts.variables) {
            opts.variables = this.calculateVariables(props);
          }
          if (typeof opts.variables === 'undefined') delete opts.variables;

          (opts as any).mutation = document;
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

        // dynmically get all of the methods from ApolloClient
        for (let key in this.client) {
          if (!this.client.hasOwnProperty(key)) continue;

          // don't overwrite any spyed methods like refetch
          if (typeof this.client[key] === 'function' && !mergedPropsAndData[key]) {
            mergedPropsAndData[key] = this.client[key];
          }
        }

        if (!haveOwnPropsChanged && !hasOperationDataChanged && renderedElement) {
          return renderedElement;
        }

        this.renderedElement = createElement(WrappedComponent, mergedPropsAndData);
        return this.renderedElement;
      }
    }

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent);

  };

};
