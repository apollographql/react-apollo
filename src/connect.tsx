/// <reference path="../typings/main.d.ts" />

import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// XXX setup type definitions for individual lodash libs
// import isObject from 'lodash.isobject';
// import isEqual from 'lodash.isequal';
import {
  isEqual,
  isObject,
} from 'lodash';

// modules don't export ES6 modules
import invariant = require('invariant');
import assign = require('object-assign');

import {
  IMapStateToProps,
  IMapDispatchToProps,
  IConnectOptions,
  connect as ReactReduxConnect,
} from 'react-redux';

import {
  Store,
} from 'redux';

import ApolloClient, { readQueryFromStore } from 'apollo-client';

import {
  GraphQLResult,
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
  mergeProps?(stateProps: any, dispatchProps: any, ownProps: any): any;
  mapQueriesToProps?(opts: MapQueriesToPropsOptions): any; // WatchQueryHandle
  mapMutationsToProps?(opts: MapMutationsToPropsOptions): any; // Mutation Handle
};

const defaultMapQueriesToProps = opts => ({ });
const defaultMapMutationsToProps = opts => ({ });
const defaultQueryData = {
  loading: true,
  error: null,
  result: null,
};
const defaultMutationData = assign({}, defaultQueryData);

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
      error: Error,
      result: GraphQLResult,
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
    const apolloConnectDisplayName = `Apollo(Connect(${getDisplayName(WrappedComponent)}))`;

    class ApolloConnect extends Component<any, any> {
      static displayName = apolloConnectDisplayName;
      static WrappedComponent = WrappedComponent;
      static contextTypes = {
        store: PropTypes.object.isRequired,
        client: PropTypes.object.isRequired,
      };

      // react and react dev tools (HMR) needs
      public state: any; // redux state
      public props: any; // passed props
      public version: number;

      // data storage
      private store: Store<any>;
      private client: ApolloClient; // apollo client
      private data: any; // apollo data

      // request / action storage
      private queryHandles: any;
      private mutations: any;

      // calculated switches to control rerenders
      private haveOwnPropsChanged: boolean;
      private hasQueryDataChanged: boolean;
      private hasMutationDataChanged: boolean;

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

        this.data = {};
        this.mutations = {};
      }

      componentWillMount() {
        const { props, state } = this;
        this.subscribeToAllQueries(props, state);
        this.createAllMutationHandles(props, state);
      }

      // // best practice says make external requests in `componentDidMount` as to
      // // not block rendering
      // componentDidMount() {

      // }

      componentWillReceiveProps(nextProps, nextState) {
        // we got new props, we need to unsubscribe and re-watch all handles
        // with the new data
        // XXX determine if any of this data is actually used somehow
        // to avoid rebinding queries if nothing has changed
        if (!isEqual(this.props, nextProps) || !isEqual(this.state, nextState)) {
          this.unsubcribeAllQueries();
          this.subscribeToAllQueries(nextProps, nextState);
        }
      }

      shouldComponentUpdate() {
        return this.haveOwnPropsChanged || this.hasQueryDataChanged || this.hasMutationDataChanged;
      }

      componentWillUnmount() {
        this.unsubcribeAllQueries();
      }

      subscribeToAllQueries(props: any, state: any) {
        const { watchQuery, reduxRootKey } = this.client;
        const { store } = this;

        const queryHandles = mapQueriesToProps({
          state,
          ownProps: props,
        });

        if (isObject && Object.keys(queryHandles).length) {
          this.queryHandles = queryHandles;

          for (const key in queryHandles) {
            if (!queryHandles.hasOwnProperty(key)) {
              continue;
            }

            const { query, variables } = queryHandles[key];

            const handle = watchQuery({ query, variables });

            // rudimentary way to manually check cache
            let queryData = defaultQueryData as any;
            try {
              const result = readQueryFromStore({
                store: store.getState()[reduxRootKey].data,
                query,
                variables,
              });

              queryData = {
                error: null,
                loading: false,
                result,
              };
            } catch (e) {/* tslint */}

            this.data[key] = queryData;

            this.handleQueryData(handle, key);
          }
        }
      }

      unsubcribeAllQueries() {
        if (this.queryHandles) {
          for (const key in this.queryHandles) {
            if (!this.queryHandles.hasOwnProperty(key)) {
              continue;
            }
            this.queryHandles[key].stop();
          }
        }
      }

      handleQueryData(handle: any, key: string) {
        // bind each handle to updating and rerendering when data
        // has been recieved

        const forceRender = ({ error, data }: any) => {
          this.data[key] = {
            loading: false,
            result: data || null,
            error,
          };

          this.hasQueryDataChanged = true;

          // update state to latest of redux store
          this.setState(this.store.getState());
        };

        handle.subscribe({
          onResult: forceRender,
          onError(error) { forceRender({ error }); },
        });
      }

      createAllMutationHandles(props: any, state: any): void {
        const mutations = mapMutationsToProps({
          state,
          ownProps: props,
        });

        if (isObject && Object.keys(mutations).length) {
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

      createMutationHandle(key: string, method: () => { mutation: string, variables?: any }): () => Promise<GraphQLResult> {
        const { mutate } = this.client;
        const { store } = this;

        // middleware to update the props to send data to wrapped component
        // when the mutation is done
        const forceRender = ({ errors, data }: GraphQLResult): GraphQLResult => {
          this.data[key] = {
            loading: false,
            result: data,
            error: errors,
          };

          this.hasMutationDataChanged = true;

          // update state to latest of redux store
          // this forces a render of children
          this.setState(store.getState());

          return {
            errors,
            data,
          };
        };

        return (...args) => {
          const { mutation, variables } = method.apply(this.client, args);
          return mutate({ mutation, variables })
            .then(forceRender)
            .catch(error => forceRender({ errors: error }));
        };
      }


      render() {
        const {
          haveOwnPropsChanged,
          hasQueryDataChanged,
          hasMutationDataChanged,
          renderedElement,
          mutations,
          props,
          data,
        } = this;

        this.haveOwnPropsChanged = false;
        this.hasQueryDataChanged = false;
        this.hasMutationDataChanged = false;

        let clientProps = {
          mutate: this.client.mutate,
          query: this.client.query,
        } as any;

        if (Object.keys(mutations).length) {
          clientProps.mutations = mutations;
        }

        const mergedPropsAndData = assign({}, props, data, clientProps);

        if (
          !haveOwnPropsChanged &&
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


