
import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
import isObject = require('lodash.isobject');
import isEqual = require('lodash.isequal');
import invariant = require('invariant');
import assign = require('object-assign');
import hoistNonReactStatics = require('hoist-non-react-statics');

import {
  IMapStateToProps,
  IMapDispatchToProps,
  IConnectOptions,
  connect as ReactReduxConnect,
} from 'react-redux';

import {
  Store,
} from 'redux';

import ApolloClient, {
  readQueryFromStore,
} from 'apollo-client';

import {
  ObservableQuery,
  QuerySubscription,
} from 'apollo-client/QueryManager';

import {
  GraphQLResult,
  Document,
} from 'graphql';

export declare interface MapQueriesToPropsOptions {
  ownProps: any;
  state: any;
};

export declare interface MapMutationsToPropsOptions {
  ownProps: any;
  state: any;
};

export declare interface ConnectOptions {
  mapStateToProps?: IMapStateToProps;
  mapDispatchToProps?: IMapDispatchToProps;
  options?: IConnectOptions;
  mergeProps?(stateProps: Object, dispatchProps: Object, ownProps: Object): Object;
  mapQueriesToProps?(opts: MapQueriesToPropsOptions): Object; // WatchQueryHandle
  mapMutationsToProps?(opts: MapMutationsToPropsOptions): Object; // Mutation Handle
};

const defaultMapQueriesToProps = opts => ({ });
const defaultMapMutationsToProps = opts => ({ });
const defaultQueryData = {
  loading: true,
  errors: null,
};
const defaultMutationData = assign({}, defaultQueryData);
defaultMutationData.loading = false;

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Helps track hot reloading.
let nextVersion = 0;

export default function connect(opts?: ConnectOptions) {

  if (!opts) {
    opts = {};
  }

  let { mapQueriesToProps, mapMutationsToProps } = opts;

  // clean up the options for passing to redux
  delete opts.mapQueriesToProps;
  delete opts.mapMutationsToProps;

  /*

    mapQueriesToProps:

    This method returns a object in the form of { [string]: WatchQueryHandle }. Each
    key will be mapped to the props passed to the wrapped component. The resulting prop will
    be an object with the following keys:

    {
      loading: boolean,
      errors: Errors,
      [key: String]: result
    }

  */
  mapQueriesToProps = mapQueriesToProps ? mapQueriesToProps : defaultMapQueriesToProps;

  /*

    mapMutationsToProps

  */
  mapMutationsToProps = mapMutationsToProps ? mapMutationsToProps : defaultMapMutationsToProps;

  // Helps track hot reloading.
  const version = nextVersion++;

  return function wrapWithApolloComponent(WrappedComponent) {
    // react-redux will wrap this further with Connect(...).
    const apolloConnectDisplayName = `Apollo(${getDisplayName(WrappedComponent)})`;

    class ApolloConnect extends Component<any, any> {
      static displayName = apolloConnectDisplayName;
      static WrappedComponent = WrappedComponent;
      static contextTypes = {
        store: PropTypes.object.isRequired,
        client: PropTypes.object.isRequired,
      };

      // react / redux and react dev tools (HMR) needs
      public state: any; // redux state
      public props: any; // passed props
      public version: number;
      public hasMounted: boolean;
      private unsubscribeFromStore: Function;

      // data storage
      private store;
      private client: ApolloClient; // apollo client
      private data: Object; // apollo data
      private previousState: Object;
      private previousQueries: Object;

      // request / action storage
      private queryObservables: any;
      private querySubscriptions: { [queryKey: string]: QuerySubscription };
      private mutations: any;

      // calculated switches to control rerenders
      private haveOwnPropsChanged: boolean;
      private hasQueryDataChanged: boolean;
      private hasMutationDataChanged: boolean;
      private hasOwnStateChanged: boolean;
      private childRenderError: any = null;
      private isRenderingError: boolean = false;

      // the element to render
      private renderedElement: any;

      constructor(props, context) {
        super(props, context);
        this.version = version;
        this.store = props.store || context.store;
        this.client = props.client || context.client;

        invariant(!!this.client,
          `Could not find "client" in either the context or ` +
          `props of "${apolloConnectDisplayName}". ` +
          `Either wrap the root component in a <Provider>, ` +
          `or explicitly pass "client" as a prop to "${apolloConnectDisplayName}".`
        );

        const storeState = this.store.getState();
        this.state = assign({}, storeState);
        this.previousState = storeState;

        this.data = {};
        this.mutations = {};
      }

      componentWillMount() {
        const { props } = this;
        this.subscribeToAllQueries(props);
        this.createAllMutationHandles(props);
        this.bindStoreUpdates();
      }

      componentDidMount() {
        this.hasMounted = true;
      }

      componentWillReceiveProps(nextProps) {
        // we got new props, we need to unsubscribe and re-watch all handles
        // with the new data
        // XXX determine if any of this data is actually used somehow
        // to avoid rebinding queries if nothing has changed
        if (!isEqual(this.props, nextProps)) {
          this.haveOwnPropsChanged = true;
          this.createAllMutationHandles(nextProps);
          this.subscribeToAllQueries(nextProps);

        }
      }

      shouldComponentUpdate(nextProps, nextState) {
        return this.haveOwnPropsChanged ||
          this.hasOwnStateChanged ||
          this.hasQueryDataChanged ||
          this.hasMutationDataChanged;
      }

      componentWillUnmount() {
        this.unsubcribeAllQueries();

        if (this.unsubscribeFromStore) {
          this.unsubscribeFromStore();
          this.unsubscribeFromStore = null;
        }
        this.hasMounted = false;
      }

      forceRenderChildren() {
        const { isRenderingError } = this;
        // ensure setState throws an error in the render
        // to prevent it from going to apollo-client as a
        // network error
        try {
          // update state to latest of redux store
          this.setState(this.store.getState());
        } catch (e) {
          // save for the next render
          this.childRenderError = e;
          this.isRenderingError = true;
          if (!isRenderingError) {
            this.forceUpdate();
          }
        }

      }

      bindStoreUpdates(): void {
        const { store } = this;
        const { reduxRootKey } = this.client;

        this.unsubscribeFromStore = store.subscribe(() => {
          const { props } = this;
          let newState = assign({}, store.getState());
          let oldState = assign({}, this.previousState);

          // we remove the apollo key from the store
          // because incomming data would trigger unneccesary
          // queries and mutations rebuilds
          delete newState[reduxRootKey];
          delete oldState[reduxRootKey];

          if (!isEqual(oldState, newState)) {
            this.previousState = newState;

            this.hasOwnStateChanged = this.subscribeToAllQueries(props);
            this.createAllMutationHandles(props);
          }
        });
      }

      subscribeToAllQueries(props: any): boolean {
        const { watchQuery, reduxRootKey } = this.client;
        const { store } = this;

        const queryOptions = mapQueriesToProps({
          state: store.getState(),
          ownProps: props,
        });

        const oldQueries = assign({}, this.previousQueries);
        this.previousQueries = assign({}, queryOptions);

        // don't re run queries if nothing has changed
        if (isEqual(oldQueries, queryOptions)) {
          return false;
        } else if (oldQueries) {
          // unsubscribe from previous queries
          this.unsubcribeAllQueries();
        }

        if (isObject(queryOptions) && Object.keys(queryOptions).length) {
          for (const key in queryOptions) {
            if (!queryOptions.hasOwnProperty(key)) {
              continue;
            }

            const { query, variables, forceFetch } = queryOptions[key];

            const handle = watchQuery(queryOptions[key]);

            // rudimentary way to manually check cache
            let queryData = defaultQueryData as any;

            // force fetch shouldn't try to read from the store
            if (!forceFetch) {
              try {
                const result = readQueryFromStore({
                  store: store.getState()[reduxRootKey].data,
                  query,
                  variables,
                });

                queryData = assign({
                  errors: null,
                  loading: false,
                }, result);
              } catch (e) {/* tslint */}
            }

            this.data[key] = queryData;

            this.handleQueryData(handle, key);
          }
        }
        return true;
      }

      unsubcribeAllQueries() {
        if (this.querySubscriptions) {
          for (const key in this.querySubscriptions) {
            if (!this.querySubscriptions.hasOwnProperty(key)) {
              continue;
            }
            this.querySubscriptions[key].unsubscribe();
          }
        }
      }

      handleQueryData(handle: ObservableQuery, key: string) {
        // bind each handle to updating and rerendering when data
        // has been recieved
        let refetch,
            startPolling,
            stopPolling;

        // since we don't have the query id, we can manually handle
        // a lifecyle event for loading if this query is refetched
        const createBoundRefetch = (dataKey, refetchMethod) => {
          return (...args) => {
            this.data[dataKey] = assign(this.data[dataKey], {
              loading: true,
              refetch,
            });

            this.hasQueryDataChanged = true;

            if (this.hasMounted) {
              // update state to latest of redux store
              this.forceRenderChildren();
            }


            return refetchMethod(...args);
          };
        };

        let oldData = {};
        const forceRender = ({ errors, data = oldData }: any) => {
          const resultKeyConflict: boolean = (
            'errors' in data ||
            'loading' in data ||
            'refetch' in data ||
            'startPolling' in data ||
            'stopPolling' in data
          );

          invariant(!resultKeyConflict,
            `the result of the '${key}' query contains keys that ` +
            `conflict with the return object. 'errors', 'loading', ` +
            `'startPolling', 'stopPolling', and 'refetch' cannot be ` +
            `returned keys`
          );

          // only rerender child component if data has changed
          // XXX should we rerender while errors are present?
          if (!isEqual(oldData, data) || errors || this.data[key].loading) {
            this.hasQueryDataChanged = true;
          }

          // cache the changed data for next check
          oldData = assign({}, data);

          this.data[key] = assign({
            loading: false,
            errors,
            refetch, // copy over refetch method
            startPolling,
            stopPolling,
          }, data);

          if (this.hasMounted) {
            this.forceRenderChildren();
          }
        };

        this.querySubscriptions[key] = handle.subscribe({
          next: forceRender,
          error(errors) { forceRender({ errors }); },
        });

        refetch = createBoundRefetch(key, this.querySubscriptions[key].refetch);
        startPolling = this.querySubscriptions[key].startPolling;
        stopPolling = this.querySubscriptions[key].stopPolling;

        this.data[key] = assign(this.data[key], {
          refetch,
          startPolling,
          stopPolling,
        });
      }

      createAllMutationHandles(props: any): void {

        const mutations = mapMutationsToProps({
          ownProps: props,
          state: this.store.getState(),
        });

        if (isObject(mutations) && Object.keys(mutations).length) {
          for (const key in mutations) {
            if (!mutations.hasOwnProperty(key)) {
              continue;
            }

            // setup thunk of mutation
            const handle = this.createMutationHandle(key, mutations[key]);

            // XXX should we validate we have what we need to prevent errors?

            // bind key to state for updating
            this.data[key] = defaultMutationData;
            this.mutations[key] = handle;
          }
        }
      }

      createMutationHandle(
        key: string,
        method: () => { mutation: Document, variables?: any }
      ): () => Promise<GraphQLResult> {
        const { mutate } = this.client;
        const { store } = this;

        // middleware to update the props to send data to wrapped component
        // when the mutation is done
        const forceRender = ({ errors, data = {} }: GraphQLResult): GraphQLResult => {
          const resultKeyConflict: boolean = (
            'errors' in data ||
            'loading' in data ||
            'refetch' in data
          );

          invariant(!resultKeyConflict,
            `the result of the '${key}' mutation contains keys that ` +
            `conflict with the return object. 'errors', 'loading', and 'refetch' cannot be ` +
            `returned keys`
          );

          this.data[key] = assign({
            loading: false,
            errors,
          }, data);

          this.hasMutationDataChanged = true;

          if (this.hasMounted) {
            // update state to latest of redux store
            // this forces a render of children
            this.forceRenderChildren();
          }

          return {
            errors,
            data,
          };
        };

        return (...args) => {
          const stateAndProps = {
            state: store.getState(),
            ownProps: this.props,
          };

          // add props and state as last argument of method
          args.push(stateAndProps);

          const { mutation, variables } = method.apply(this.client, args);
          return new Promise((resolve, reject) => {
            this.data[key] = assign(this.data[key], {
              loading: true,
            });

            this.hasMutationDataChanged = true;

            if (this.hasMounted) {
              // update state to latest of redux store
              // this forces a render of children
              this.forceRenderChildren();
            }

            resolve();
          })
            .then(() => {
              return mutate({ mutation, variables });
            })
            .then(forceRender)
            .catch(errors => forceRender({ errors }));
        };
      }


      render() {
        const {
          haveOwnPropsChanged,
          hasOwnStateChanged,
          hasQueryDataChanged,
          hasMutationDataChanged,
          childRenderError,
          renderedElement,
          mutations,
          props,
          data,
        } = this;

        this.childRenderError = null;
        if (childRenderError) {
          throw childRenderError;
        }

        this.haveOwnPropsChanged = false;
        this.hasOwnStateChanged = false;
        this.hasQueryDataChanged = false;
        this.hasMutationDataChanged = false;

        let clientProps = {} as any;

        if (Object.keys(mutations).length) {
          clientProps.mutations = mutations;
        }

        const mergedPropsAndData = assign({}, props, clientProps, data);

        // dynmically get all of the methods from ApolloClient
        for (let key in this.client) {
          if (!this.client.hasOwnProperty(key)) {
            continue;
          }
          // don't overwrite any spyed methods like refetch
          if (typeof this.client[key] === 'function' && !mergedPropsAndData[key]) {
            mergedPropsAndData[key] = this.client[key];
          }
        }

        if (
          !haveOwnPropsChanged &&
          !hasOwnStateChanged &&
          !hasQueryDataChanged &&
          !hasMutationDataChanged &&
          renderedElement
         ) {
          return renderedElement;
        }

        this.renderedElement = createElement(WrappedComponent, mergedPropsAndData);
        return this.renderedElement;
      }

    }

    // Make sure we preserve any custom statics on the original component.
    hoistNonReactStatics(ApolloConnect, WrappedComponent);

    // apply react-redux args from original args
    const { mapStateToProps, mapDispatchToProps, mergeProps, options } = opts;
    return ReactReduxConnect(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options
    )(ApolloConnect);

  };

};
