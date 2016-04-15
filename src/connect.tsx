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

export declare interface MapQueriesToPropsOptions {
  ownProps: any;
  state: any;
  watchQuery(opts: any): any; // WatchQueryHandle
};

export declare interface MapMutationsToPropsOptions {
  ownProps: any;
  state: any;
  mutate(opts: any): any; // MutationHandle
  onPostReply(raw: any): any; // MutationHandle
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

    This connect is a wrapper around react-redux's connect. If called
    without any apollo specific actions, we can pass the props straight to
    react-redux's connect and call it quits

  */
  if (!mapQueriesToProps && !mapMutationsToProps) {
    const { mapStateToProps, mapDispatchToProps, mergeProps, options } = opts;
    return function passReactReduxArgumentsPlain(WrappedComponent) {
      return ReactReduxConnect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps,
        options
      )(WrappedComponent);
    };
  };

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

      public version: number;
      public store: Store<any>;
      public client: any; // apollo client
      public state: any; // redux state
      public props: any; // passed props
      public data: any; // apollo data
      public queryHandles: any;
      public haveOwnPropsChanged: boolean;
      public hasQueryDataChanged: boolean;
      public hasMutationDataChanged: boolean;
      public renderedElement: any;

      constructor(props, context) {
        super(props, context);
        this.version = version;
        this.store = props.store || context.store;
        this.client = props.client || context.client;

        invariant(this.client,
          `Could not find "client" in either the context or ` +
          `props of "${apolloConnectDisplayName}". ` +
          `Either wrap the root component in a <Provider>, ` +
          `or explicitly pass "client" as a prop to "${apolloConnectDisplayName}".`
        );

        const storeState = this.store.getState();
        this.state = assign({}, storeState);

        this.data = {};
      }

      componentWillMount() {
        const { props, state } = this;
        this.subscribeToAllQueries(props, state);
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
        const { watchQuery } = this.client;

        const queryHandles = mapQueriesToProps({
          watchQuery,
          state,
          ownProps: props,
        });

        if (isObject && Object.keys(queryHandles).length) {
          this.queryHandles = queryHandles;

          for (const key in queryHandles) {
            if (!queryHandles.hasOwnProperty(key)) {
              continue;
            }

            const handle = queryHandles[key];

            // bind key to state for updating
            this.data[key] = defaultQueryData;

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
        handle.onResult(({ error, data }) => {
          this.data[key] = {
            loading: false,
            result: data,
            error,
          };

          this.hasQueryDataChanged = true;

          // update state to latest of redux store
          this.setState(this.store.getState());
        });
      }

      render() {
        const {
          haveOwnPropsChanged,
          hasQueryDataChanged,
          hasMutationDataChanged,
          renderedElement,
        } = this;

        this.haveOwnPropsChanged = false;
        this.hasQueryDataChanged = false;
        this.hasMutationDataChanged = false;

        const mergedPropsAndData = assign({}, this.props, this.data);

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


