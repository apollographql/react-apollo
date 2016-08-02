
import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
// import isObject = require('lodash.isobject');
import isEqual = require('lodash.isequal');
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

export default function graphql(
  document: Document,
  mapPropsToOptions: (props: any) => QueryOptions | MutationOptions = defaultMapPropsToOptions,
  mapResultToProps: (props: any) => any = defaultMapResultToProps
) {

  // handle null case
  if (!mapPropsToOptions) mapPropsToOptions = defaultMapPropsToOptions;

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
      private unsubscribeFromStore: Function;

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
        this.bindStoreUpdatesForErrors();

      }

      componentWillReceiveProps(nextProps) {
        if (isEqual(this.props, nextProps)) return;

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

        if (this.unsubscribeFromStore) {
          this.unsubscribeFromStore();
          this.unsubscribeFromStore = null;
        }
        this.hasMounted = false;
      }

      calculateVariables(props) { return calculateVariables(props); };

      calculateResultProps(result) {
        return mapResultToProps(result);
      }

      setInitialProps() {
        if (this.type === DocumentType.Mutation) {
           this.createWrappedMutation(this.props);
          return;
        }

        const { reduxRootKey } = this.client;
        let queryData = defaultQueryData as any;
        try {
          const result = readQueryFromStore({
            store: this.store.getState()[reduxRootKey].data,
            query: document,
            variables: this.calculateVariables(this.props),
          });
          queryData = assign({ errors: null, loading: false }, result);
        } catch (e) {/* tslint:disable-line */}

        this.data = queryData;
      }

      bindStoreUpdatesForErrors(): void {
        const { store } = this;
        const { reduxRootKey } = this.client;

        let previousError;
        this.unsubscribeFromStore = store.subscribe(() => {
          const state = store.getState();
          const { queryId } = this.queryObservable as ObservableQuery;

          if (!state[reduxRootKey].queries[queryId]) return;

          const { networkError, graphQLErrors, loading } = state[reduxRootKey].queries[queryId];
          if (!networkError && (!graphQLErrors || !graphQLErrors.length)) return;

          const error = new ApolloError({
            networkError,
            graphQLErrors,
            errorMessage: `There was a graphql error while running the operation passed to ${graphQLDisplayName}` // tslint:disable-line
          });

          if (isEqual(error, previousError)) return;
          previousError = error;

          this.hasOperationDataChanged = true;
          this.data = assign(this.data, { error, loading });
          this.forceRenderChildren();

        });
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
          (!isEqual(opts.variables, (this.previousOpts as WatchQueryOptions).variables)) &&
          (isEqual(old, neu))
        ) {
          this.hasOperationDataChanged = true;
          this.data = assign(this.data, { loading: true });
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

        this.handleQueryData(observableQuery);
      }

      unsubscribeFromQuery() {
        if ((this.querySubscription as Subscription).unsubscribe) {
          (this.querySubscription as Subscription).unsubscribe();
          delete this.queryObservable;
        }
      }

      handleQueryData(observableQuery: ObservableQuery): void {
        const { reduxRootKey } = this.client;
        // bind each handle to updating and rerendering when data
        // has been recieved
        let refetch,
            fetchMore,
            startPolling,
            stopPolling,
            oldData = {};

        const next = ({ data = oldData/*, loading */ }: any) => {

          // XXX use passed loading after https://github.com/apollostack/apollo-client/pull/467
          const { queryId } = observableQuery;
          const loading = this.store.getState()[reduxRootKey].queries[queryId].loading;

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
          this.data = assign({ loading, refetch, startPolling, stopPolling, fetchMore }, data);

          this.forceRenderChildren();
        };

        const createBoundRefetch = (refetchMethod) => (...args) => {
          this.data = assign(this.data, { loading: true });

          this.hasOperationDataChanged = true;
          this.forceRenderChildren();
          // XXX why doesn't apollo-client fire next on a refetch with the same data?
          return refetchMethod(...args)
            .then((result) => {
              if (isEqual(result.data, oldData)) {
                next(result);
              }

              return result;
            });
        };

        this.queryObservable = observableQuery;

        /*

          Since `setState()` can throw an error if the child had a render error,
          we can't use the `error` part of the query subscription. If we do, all children
          errors are captured as NetworkErrors which isn't true / helpful.

          Instead, we subscribe to the store for network errors and re-render that way
        */
        this.querySubscription = observableQuery.subscribe({ next });

        refetch = createBoundRefetch((this.queryObservable as any).refetch);
        fetchMore = createBoundRefetch((this.queryObservable as any).fetchMore);
        startPolling = (this.queryObservable as any).startPolling;
        stopPolling = (this.queryObservable as any).stopPolling;

        // XXX the tests seem to be keeping the error around?
        delete this.data.error;
        this.data = assign(this.data, { refetch, startPolling, stopPolling, fetchMore});
      }

      forceRenderChildren() {
        // force a rerender that goes through shouldComponentUpdate
        if (this.hasMounted) this.setState({});
      }

      createWrappedMutation(props: any, reRender = false) {
        if (this.type !== DocumentType.Mutation) return;

        // XXX do we want to do any loading state stuff here?
        this.data = (variables) => {
          const opts = mapPropsToOptions(props) as any;

          // merge variables
          if (variables) opts.variables = assign({}, opts.variables, variables);

          opts.mutation = document;
          if (!opts.variables && !variables) opts.variables = this.calculateVariables(props);

          return this.client.mutate(opts);
        };

        if (!reRender) return;

        this.hasOperationDataChanged = true;
        this.forceRenderChildren();
      }

      render() {
        const { haveOwnPropsChanged, hasOperationDataChanged, renderedElement, props, data } = this;

        this.haveOwnPropsChanged = false;
        this.hasOperationDataChanged = false;

        const clientProps = { [operation.name]: this.calculateResultProps(data) };
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
