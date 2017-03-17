import {
  Component,
  createElement,
  PropTypes,
  ComponentClass,
  StatelessComponent,
} from 'react';

// modules don't export ES6 modules
import pick = require('lodash.pick');
import shallowEqual from './shallowEqual';

import invariant = require('invariant');
import assign = require('object-assign');

import hoistNonReactStatics = require('hoist-non-react-statics');

import ApolloClient, {
  ObservableQuery,
  MutationQueryReducersMap,
  Subscription,
  ApolloStore,
  ApolloQueryResult,
  ApolloError,
  FetchPolicy,
} from 'apollo-client';

import {
  FetchMoreOptions,
  UpdateQueryOptions,
} from 'apollo-client/core/ObservableQuery';

import {
  FetchMoreQueryOptions,
  SubscribeToMoreOptions,
} from 'apollo-client/core/watchQueryOptions';

import {
  // GraphQLResult,
  DocumentNode,
} from 'graphql';

import { parser, DocumentType } from './parser';

export declare interface MutationOptions {
  variables?: Object;
  optimisticResponse?: Object;
  updateQueries?: MutationQueryReducersMap;
}

export declare interface QueryOptions {
  ssr?: boolean;
  variables?: { [key: string]: any };
  fetchPolicy?: FetchPolicy;
  pollInterval?: number;
  // deprecated
  skip?: boolean;
}

export interface GraphQLDataProps {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: {
    [variable: string]: any;
  };
  fetchMore: (fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions) => Promise<ApolloQueryResult<any>>;
  refetch: (variables?: any) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  subscribeToMore: (options: SubscribeToMoreOptions) => () => void;
  updateQuery: (mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any) => void;
}

export interface InjectedGraphQLProps<T> {
  data?: T & GraphQLDataProps;
}

const defaultMapPropsToOptions = props => ({});
const defaultMapResultToProps = props => props;
const defaultMapPropsToSkip = props => false;

// the fields we want to copy over to our data prop
function observableQueryFields(observable) {
  const fields = pick(observable, 'variables',
    'refetch', 'fetchMore', 'updateQuery', 'startPolling', 'stopPolling', 'subscribeToMore');

  Object.keys(fields).forEach((key) => {
    if (typeof fields[key] === 'function') {
      fields[key] = fields[key].bind(observable);
    }
  });

  return fields;
}

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Helps track hot reloading.
let nextVersion = 0;

export function withApollo(
  WrappedComponent,
  operationOptions: OperationOption = {},
) {

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
          `Wrap the root component in an <ApolloProvider>`,
        );

    }

    getWrappedInstance() {
      invariant(operationOptions.withRef,
        `To access the wrapped instance, you need to specify ` +
        `{ withRef: true } in the options`,
      );

      return (this.refs as any).wrappedInstance;
    }

    render() {
      const props = assign({}, this.props);
      props.client = this.client;
      if (operationOptions.withRef) props.ref = 'wrappedInstance';
      return createElement(WrappedComponent, props);
    }
  }

  // Make sure we preserve any custom statics on the original component.
  return hoistNonReactStatics(WithApollo, WrappedComponent, {});
};

export interface OperationOption {
  options?: Object | ((props: any) => QueryOptions | MutationOptions);
  props?: (props: any) => any;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (props: any, nextProps: any) => boolean;
  alias?: string;
}

export interface WrapWithApollo {
  <P, TComponentConstruct extends (ComponentClass<P> | StatelessComponent<P>)>(component: TComponentConstruct): TComponentConstruct;
}

export default function graphql(
  document: DocumentNode,
  operationOptions: OperationOption = {},
) {

  // extract options
  const { options = defaultMapPropsToOptions, skip = defaultMapPropsToSkip, alias = 'Apollo' } = operationOptions;

  let mapPropsToOptions = options as (props: any) => QueryOptions | MutationOptions;
  if (typeof mapPropsToOptions !== 'function') mapPropsToOptions = () => options;

  let mapPropsToSkip = skip as (props: any) => boolean;
  if (typeof mapPropsToSkip !== 'function') mapPropsToSkip = (() => skip as any);

  const mapResultToProps = operationOptions.props;

  // safety check on the operation
  const operation = parser(document);

  // Helps track hot reloading.
  const version = nextVersion++;

  const wrapWithApolloComponent: WrapWithApollo = WrappedComponent => {

    const graphQLDisplayName = `${alias}(${getDisplayName(WrappedComponent)})`;

    // A recycler that we can use to recycle old observable queries to keep
    // them hot between component unmounts and remounts.
    //
    // Note that the existence of this recycler could potentially cause memory
    // leaks if many components are being created and unmounted in parallel.
    // However, this is an unlikely scenario.
    const recycler = new ObservableQueryRecycler();

    class GraphQL extends Component<any, any> {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;
      static contextTypes = {
        store: PropTypes.object.isRequired,
        client: PropTypes.object.isRequired,
      };

      // react / redux and react dev tools (HMR) needs
      public props: any; // passed props
      public version: number;
      public hasMounted: boolean;

      // data storage
      private store: ApolloStore;
      private client: ApolloClient; // apollo client
      private type: DocumentType;

      // request / action storage. Note that we delete querySubscription if we
      // unsubscribe but never delete queryObservable once it is created. We
      // only delete queryObservable when we unmount the component.
      private queryObservable: ObservableQuery<any> | any;
      private querySubscription: Subscription;
      private previousData: any = {};
      private lastSubscriptionData: any;

      // calculated switches to control rerenders
      private shouldRerender: boolean;

      // the element to render
      private renderedElement: any;

      constructor(props, context) {
        super(props, context);
        this.version = version;
        this.client = context.client;

        invariant(!!this.client,
          `Could not find "client" in the context of ` +
          `"${graphQLDisplayName}". ` +
          `Wrap the root component in an <ApolloProvider>`,
        );

        this.store = this.client.store;
        this.type = operation.type;
      }

      componentWillMount() {
        if (!this.shouldSkip(this.props)) {
          this.setInitialProps();
        }
      }

      componentDidMount() {
        this.hasMounted = true;
        if (this.type === DocumentType.Mutation) return;

        if (!this.shouldSkip(this.props)) {
          this.subscribeToQuery();
        }
      }

      componentWillReceiveProps(nextProps, nextContext) {
        if (shallowEqual(this.props, nextProps) && this.client === nextContext.client) {
          return;
        }

        this.shouldRerender = true;

        if (this.client !== nextContext.client) {
          this.client = nextContext.client;
          this.unsubscribeFromQuery();
          this.queryObservable = null;
          this.previousData = {};
          this.updateQuery(nextProps);
          if (!this.shouldSkip(nextProps)) {
            this.subscribeToQuery();
          }
          return;
        }
        if (this.type === DocumentType.Mutation) {
          return;
        };
        if (this.type === DocumentType.Subscription
          && operationOptions.shouldResubscribe
          && operationOptions.shouldResubscribe(this.props, nextProps)) {
          this.unsubscribeFromQuery();
          delete this.queryObservable;
          this.updateQuery(nextProps);
          this.subscribeToQuery();
          return;
        }
        if (this.shouldSkip(nextProps)) {
          if (!this.shouldSkip(this.props)) {
            // if this has changed, we better unsubscribe
            this.unsubscribeFromQuery();
          }
          return;
        }

        this.updateQuery(nextProps);
        this.subscribeToQuery();
      }

      shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !!nextContext || this.shouldRerender;
      }

      componentWillUnmount() {
        if (this.type === DocumentType.Query) {
          // Recycle the query observable if there ever was one.
          if (this.queryObservable) {
            recycler.recycle(this.queryObservable);
            delete this.queryObservable;
          }

          // Unsubscribe from our query subscription.
          this.unsubscribeFromQuery();
        }

        if (this.type === DocumentType.Subscription) this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      calculateOptions(props = this.props, newOpts?) {
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
            `passed to '${graphQLDisplayName}'`,
          );
        }
        opts = { ...opts, variables };
        return opts;
      };

      calculateResultProps(result) {
        let name = this.type === DocumentType.Mutation ? 'mutate' : 'data';
        if (operationOptions.name) name = operationOptions.name;

        const newResult = { [name]: result, ownProps: this.props };
        if (mapResultToProps) return mapResultToProps(newResult);

        return { [name]: defaultMapResultToProps(result) };
      }

      setInitialProps() {
        if (this.type === DocumentType.Mutation) {
          return;
        }

        // Create the observable but don't subscribe yet. The query won't
        // fire until we do.
        const opts: QueryOptions = this.calculateOptions(this.props);

        this.createQuery(opts);
      }

      createQuery(opts: QueryOptions) {
        if (this.type === DocumentType.Subscription) {
          this.queryObservable = this.client.subscribe(assign({
            query: document,
          }, opts));
        } else {
          // Try to reuse an `ObservableQuery` instance from our recycler. If
          // we get null then there is no instance to reuse and we should
          // create a new `ObservableQuery`. Otherwise we will use our old one.
          const queryObservable = recycler.reuse(opts);

          if (queryObservable === null) {
            this.queryObservable = this.client.watchQuery(assign({
              query: document,
              metadata: {
                reactComponent: {
                  displayName: graphQLDisplayName,
                },
              },
            }, opts));
          } else {
            this.queryObservable = queryObservable;
          }
        }
      }

      updateQuery(props) {
        const opts = this.calculateOptions(props) as QueryOptions;

        // if we skipped initially, we may not have yet created the observable
        if (!this.queryObservable) {
          this.createQuery(opts);
        }

        if (this.queryObservable._setOptionsNoResult) {
          // Since we don't care about the result, use a hacky version to
          // work around https://github.com/apollostack/apollo-client/pull/694
          // This workaround is only present in Apollo Client 0.4.21
          this.queryObservable._setOptionsNoResult(opts);
        } else {
          if (this.queryObservable.setOptions) {
            this.queryObservable.setOptions(opts)
              // The error will be passed to the child container, so we don't
              // need to log it here. We could concievably log something if
              // an option was set. OTOH we don't log errors w/ the original
              // query. See https://github.com/apollostack/react-apollo/issues/404
              .catch((error) => null);
          }
        }
      }

      // For server-side rendering (see server.ts)
      fetchData(): Promise<ApolloQueryResult<any>> | boolean {
        if (this.shouldSkip()) return false;
        if (
          operation.type === DocumentType.Mutation || operation.type === DocumentType.Subscription
        ) return false;

        const opts = this.calculateOptions() as any;
        if (opts.ssr === false) return false;
        if (opts.fetchPolicy === 'network-only') {
          opts.fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
        }

        const observable = this.client.watchQuery(assign({ query: document }, opts));
        const result = observable.currentResult();

        if (result.loading) {
          return observable.result();
        } else {
          return false;
        }
      }

      subscribeToQuery() {
        if (this.querySubscription) {
          return;
        }

        const next = (results: any) => {
          if (this.type === DocumentType.Subscription) {
            // Subscriptions don't currently support `currentResult`, so we
            // need to do this ourselves
            this.lastSubscriptionData = results;

            results = { data: results };
          }
          const clashingKeys = Object.keys(observableQueryFields(results.data));
          invariant(clashingKeys.length === 0,
            `the result of the '${graphQLDisplayName}' operation contains keys that ` +
            `conflict with the return object.` +
            clashingKeys.map(k => `'${k}'`).join(', ') + ` not allowed.`,
          );

          this.forceRenderChildren();
        };

        const handleError = (error) => {
          // Quick fix for https://github.com/apollostack/react-apollo/issues/378
          if (error.hasOwnProperty('graphQLErrors')) return next({ error });
          throw error;
        };
        /*

          Since `setState()` can throw an error if the child had a render error,
          we can't use the `error` part of the query subscription. If we do, all children
          errors are captured as NetworkErrors which isn't true / helpful.

          Instead, we subscribe to the store for network errors and re-render that way
        */
        this.querySubscription = this.queryObservable.subscribe({ next, error: handleError });
      }

      unsubscribeFromQuery() {
        if (this.querySubscription) {
          (this.querySubscription as Subscription).unsubscribe();
          delete this.querySubscription;
        }
      }

      shouldSkip(props = this.props) {
        return mapPropsToSkip(props) ||
          (mapPropsToOptions(props) as QueryOptions).skip;
      }

      forceRenderChildren() {
        // force a rerender that goes through shouldComponentUpdate
        this.shouldRerender = true;
        if (this.hasMounted) this.setState({});
      }

      getWrappedInstance() {
        invariant(operationOptions.withRef,
          `To access the wrapped instance, you need to specify ` +
          `{ withRef: true } in the options`,
        );

        return (this.refs as any).wrappedInstance;
      }

      dataForChild() {
        if (this.type === DocumentType.Mutation) {
          return (mutationOpts: MutationOptions) => {
            const opts = this.calculateOptions(this.props, mutationOpts);

            if (typeof opts.variables === 'undefined') delete opts.variables;

            (opts as any).mutation = document;
            return this.client.mutate((opts as any));
          };
        }

        const opts = this.calculateOptions(this.props);
        const data = {};
        assign(data, observableQueryFields(this.queryObservable));

        if (this.type === DocumentType.Subscription) {
          assign(data, {
            loading: !this.lastSubscriptionData,
            variables: opts.variables,
          }, this.lastSubscriptionData);

        } else {
          // fetch the current result (if any) from the store
          const currentResult = this.queryObservable.currentResult();
          const { loading, error, networkStatus } = currentResult;
          assign(data, { loading, networkStatus });

          // Define the error property on the data object. If the user does
          // not get the error object from `data` within 10 milliseconds
          // then we will log the error to the console.
          //
          // 10 milliseconds is an arbitrary number picked to work around any
          // potential asynchrony in React rendering. It is not super important
          // that the error be logged ASAP, but 10 ms is enough to make it
          // _feel_ like it was logged ASAP while still tolerating asynchrony.
          let logErrorTimeoutId = setTimeout(() => {
            if (error) {
              console.error('Unhandled (in react-apollo)', error.stack || error);
            }
          }, 10);
          Object.defineProperty(data, 'error', {
            configurable: true,
            enumerable: true,
            get: () => {
              clearTimeout(logErrorTimeoutId);
              return error;
            },
          });

          if (loading) {
            // while loading, we should use any previous data we have
            assign(data, this.previousData, currentResult.data);
          } else {
            assign(data, currentResult.data);
            this.previousData = currentResult.data;
          }
        }
        return data;
      }

      render() {
        if (this.shouldSkip()) {
          return createElement(WrappedComponent, this.props);
        }

        const { shouldRerender, renderedElement, props } = this;
        this.shouldRerender = false;

        const data = this.dataForChild();
        const clientProps = this.calculateResultProps(data);
        const mergedPropsAndData = assign({}, props, clientProps);

        if (!shouldRerender && renderedElement && renderedElement.type === WrappedComponent) {
          return renderedElement;
        }

        if (operationOptions.withRef) mergedPropsAndData.ref = 'wrappedInstance';
        this.renderedElement = createElement(WrappedComponent, mergedPropsAndData);
        return this.renderedElement;
      }
    }

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  };

  return wrapWithApolloComponent;
};

/**
 * An observable query recycler stores some observable queries that are no
 * longer in use, but that we may someday use again.
 *
 * Recycling observable queries avoids a few unexpected functionalities that
 * may be hit when using the `react-apollo` API. Namely not updating queries
 * when a component unmounts, and calling reducers/`updateQueries` more times
 * then is necessary for old observable queries.
 *
 * We assume that the GraphQL document for every `ObservableQuery` is the same.
 *
 * For more context on why this was added and links to the issues recycling
 * `ObservableQuery`s fixes see issue [#462][1].
 *
 * [1]: https://github.com/apollographql/react-apollo/pull/462
 */
class ObservableQueryRecycler {
  /**
   * The internal store for our observable queries and temporary subscriptions.
   */
  private observableQueries: Array<{
    observableQuery: ObservableQuery<any>,
    subscription: Subscription,
  }> = [];

  /**
   * Recycles an observable query that the recycler is finished with. It is
   * stored in this class so that it may be used later on.
   *
   * A subscription is made to the observable query so that it continues to
   * live even though the updates are noops.
   *
   * By recycling an observable query we keep the results fresh so that when it
   * gets reused all of the mutations that have happened since recycle and
   * reuse have been applied.
   */
  public recycle (observableQuery: ObservableQuery<any>): void {
    // Stop the query from polling when we recycle. Polling may resume when we
    // reuse it and call `setOptions`.
    observableQuery.stopPolling();

    this.observableQueries.push({
      observableQuery,
      subscription: observableQuery.subscribe({}),
    });
  }

  /**
   * Reuses an observable query that was recycled earlier on in this class’s
   * lifecycle. This observable was kept fresh by our recycler with a
   * subscription that will be unsubscribed from before returning the
   * observable query.
   *
   * All mutations that occured between the time of recycling and the time of
   * reusing have been applied.
   */
  public reuse (options: QueryOptions): ObservableQuery<any> {
    if (this.observableQueries.length <= 0) {
      return null;
    }
    const { observableQuery, subscription } = this.observableQueries.pop();
    subscription.unsubscribe();

    // When we reuse an `ObservableQuery` then the document and component
    // GraphQL display name should be the same. Only the options may be
    // different.
    //
    // Therefore we need to set the new options.
    //
    // If this observable query used to poll then polling will be restarted.
    observableQuery.setOptions(options);

    return observableQuery;
  }
}
