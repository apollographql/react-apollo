import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
import isEqual = require('lodash.isequal');
import flatten = require('lodash.flatten');
import pick = require('lodash.pick');
import shallowEqual from './shallowEqual';

import invariant = require('invariant');
import assign = require('object-assign');

import hoistNonReactStatics = require('hoist-non-react-statics');

import ApolloClient, {
  readQueryFromStore,
  createFragmentMap,
  ApolloError,
  WatchQueryOptions,
  ObservableQuery,
  MutationBehavior,
  MutationQueryReducersMap,
  Subscription,
  ApolloStore,
} from 'apollo-client';

import {
  // GraphQLResult,
  Document,
  FragmentDefinition,
} from 'graphql';

import { parser, DocumentType } from './parser';

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

// the fields we want to copy over to our data prop
const observableQueryFields = observable => pick(observable, 'variables',
  'refetch', 'fetchMore', 'updateQuery', 'startPolling', 'stopPolling');

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

    // XXX: what is up with this? We shouldn't have to do this.
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

      if (opts.fragments) {
        opts.fragments = calculateFragments(opts.fragments);
      }

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

      // if this query is in the store, don't block execution
      try {
        readQueryFromStore({
          store: client.queryManager.getApolloState().data,
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
      private queryObservable: ObservableQuery;
      private querySubscription: Subscription;

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

        // Create the observable but don't subscribe yet. The query won't
        // fire until we do.
        const opts: QueryOptions = this.calculateOptions(this.props);
        this.data = assign({}, defaultQueryData) as any;

        if (opts.skip) {
          this.data.loading = false;
        } else {
          this.createQuery(opts);
        }
      }

      createQuery(opts: QueryOptions) {
        this.queryObservable = this.client.watchQuery(assign({
          query: document,
        }, opts));

        assign(this.data, observableQueryFields(this.queryObservable));

        if (!opts.forceFetch) {
          // try and fetch initial data from the store
          assign(this.data, this.queryObservable.currentResult());
        }
      }

      subscribeToQuery(props): boolean {
        const opts = calculateOptions(props) as QueryOptions;

        // don't rerun if nothing has changed
        if (isEqual(opts, this.previousOpts)) return false;

        // XXX: tear down old subscription if it exists
        if (opts.skip) return;

        // XXX: this seems like the wrong function to do this in, should it be in willReceiveProps?
        // We've subscribed already, just change stuff.
        if (this.querySubscription) {
          this.queryObservable.setVariables(opts.variables);

          // Ensure we are up-to-date with the latest state of the world
          assign(this.data,
            { loading: this.queryObservable.currentResult().loading },
            observableQueryFields(this.queryObservable));

          // XXX: if pollingInterval is set, it may have changed, we could called
          // this.queryObservable.startPolling here
          return;
        }

        // if we skipped initially, we may not have yet created the observable
        if (!this.queryObservable) {
          this.createQuery(opts);
        }

        let oldData = {};
        const next = ({ data = oldData, loading, error }: any) => {

        const { queryId } = this.queryObservable;

          invariant(Object.keys(observableQueryFields(data)).length === 0,
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
            loading,
            error,
          }, data, observableQueryFields(this.queryObservable));

          this.forceRenderChildren();
        };

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
        this.querySubscription = this.queryObservable.subscribe({ next, error: handleError });

        // XXX: can remove this?
        // XXX the tests seem to be keeping the error around?
        delete this.data.error;
      }

      unsubscribeFromQuery() {
        if ((this.querySubscription as Subscription).unsubscribe) {
          (this.querySubscription as Subscription).unsubscribe();
          delete this.queryObservable;
        }
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
