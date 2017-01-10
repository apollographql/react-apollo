import {
  Component,
  ComponentClass,
  StatelessComponent,
  createElement,
  PropTypes,
} from 'react';

import { FetchMoreOptions, UpdateQueryOptions } from './../node_modules/apollo-client/core/ObservableQuery';
import { FetchMoreQueryOptions, SubscribeToMoreOptions } from './../node_modules/apollo-client/core/watchQueryOptions';

// modules don't export ES6 modules
import pick = require('lodash.pick');
import flatten = require('lodash.flatten');
import shallowEqual from './shallowEqual';

import invariant = require('invariant');
import assign = require('object-assign');

import hoistNonReactStatics = require('hoist-non-react-statics');

import ApolloClient, {
  ObservableQuery,
  MutationBehavior,
  MutationQueryReducersMap,
  Subscription,
  ApolloStore,
  ApolloQueryResult,
} from 'apollo-client';

import {
  DocumentNode,
  FragmentDefinitionNode,
} from 'graphql';

import { parser, DocumentType } from './parser';

export declare interface MutationOptions {
  variables?: Object;
  resultBehaviors?: MutationBehavior[];
  fragments?: FragmentDefinitionNode[] | FragmentDefinitionNode[][];
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
  fragments?: FragmentDefinitionNode[] | FragmentDefinitionNode[][];
  // deprecated
  skip?: boolean;
}

export type WrappedComponent<T> = ComponentClass<T> | StatelessComponent<T>;

function defaultMapPropsToOptions<T>(props: T) {
  return {};
}

function defaultMapResultToProps<T>(props: T) {
  return props;
}

function defaultMapPropsToSkip<T>(props: T)  {
  return false;
}

interface ObservableQueryFields {
  variables: any;
  refetch(variables?: any): Promise<ApolloQueryResult>;
  fetchMore(fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions): Promise<ApolloQueryResult>;
  updateQuery(mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any): void;
  startPolling(pollInterval: number): void;
  stopPolling(): void;
  subscribeToMore(options: SubscribeToMoreOptions): () => void;
}
// the fields we want to copy over to our data prop
function observableQueryFields(observable: ObservableQuery): ObservableQueryFields {
  const fields = pick<ObservableQueryFields, ObservableQuery>(observable, 'variables',
    'refetch', 'fetchMore', 'updateQuery', 'startPolling', 'stopPolling', 'subscribeToMore');

  Object.keys(fields).forEach((key) => {
    if (typeof (fields as any)[key] === 'function') {
      (fields as any)[key] = (fields as any)[key].bind(observable);
    }
  });

  return fields;
}

function getDisplayName<T>(WrappedComponent: WrappedComponent<T>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Helps track hot reloading.
let nextVersion = 0;

export function withApollo<T extends { client: ApolloClient }>(WrappedComponent: WrappedComponent<T>) {

  const withDisplayName = `withApollo(${getDisplayName(WrappedComponent)})`;

  class WithApollo extends Component<T, void> {
    static displayName = withDisplayName;
    static WrappedComponent = WrappedComponent;
    static contextTypes = { client: PropTypes.object.isRequired };

    // data storage
    private client: ApolloClient; // apollo client

    constructor(props: T, context: { client: ApolloClient }) {
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
      return createElement(WrappedComponent as React.ComponentClass<T>, props);
    }
  }

  // Make sure we preserve any custom statics on the original component.
  return hoistNonReactStatics(WithApollo, WrappedComponent, {});
};

export interface OperationOption {
  options?: Object | ((props: any) => QueryOptions | MutationOptions);
  props?: <TOwnProps, TMappedProps>(props: TOwnProps) => TMappedProps;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (props: any, nextProps: any) => boolean;
}

export default function graphql(
  document: DocumentNode,
  operationOptions: OperationOption = {}
) {

  // extract options
  const { options = defaultMapPropsToOptions, skip = defaultMapPropsToSkip } = operationOptions;

  let mapPropsToOptions = options as (props: any) => QueryOptions | MutationOptions;
  if (typeof mapPropsToOptions !== 'function') mapPropsToOptions = () => options;

  let mapPropsToSkip = skip as (props: any) => boolean;
  if (typeof mapPropsToSkip !== 'function') mapPropsToSkip = (() => skip as any);

  const mapResultToProps = operationOptions.props;

  // safety check on the operation
  const operation = parser(document);

  // Helps track hot reloading.
  const version = nextVersion++;
  return function wrapWithApolloComponent<T>(WrappedComponent: WrappedComponent<T>) {

    const graphQLDisplayName = `Apollo(${getDisplayName(WrappedComponent)})`;

    class GraphQL extends Component<T, any> {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;
      static contextTypes = {
        store: PropTypes.object.isRequired,
        client: PropTypes.object.isRequired,
      };

      // react / redux and react dev tools (HMR) needs
      public props: T; // passed props
      public version: number;
      public hasMounted: boolean;

      // data storage
      private store: ApolloStore;
      private client: ApolloClient; // apollo client
      private type: DocumentType;

      // request / action storage. Note that we delete querySubscription if we
      // unsubscribe but never delete queryObservable once it is created.
      private queryObservable: ObservableQuery | any;
      private querySubscription: Subscription;
      private previousData: { [i: string]: any } = {};
      private lastSubscriptionData: { [i: string]: any };

      // calculated switches to control rerenders
      private shouldRerender: boolean;

      // the element to render
      private renderedElement: any;

      constructor(props: T, context: any) {
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

        if (this.shouldSkip(props)) return;
        this.setInitialProps();
      }

      componentDidMount() {
        this.hasMounted = true;
        if (this.type === DocumentType.Mutation) return;

        if (!this.shouldSkip(this.props)) {
          this.subscribeToQuery();
        }
      }

      componentWillReceiveProps(nextProps: T) {
        if (shallowEqual(this.props, nextProps)) return;

        this.shouldRerender = true;

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

      shouldComponentUpdate(nextProps: T, nextState: any, nextContext: any) {
        return !!nextContext || this.shouldRerender;
      }

      componentWillUnmount() {
        if (this.type === DocumentType.Query) this.unsubscribeFromQuery();
        if (this.type === DocumentType.Subscription) this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      calculateOptions(props = this.props, newOpts?: any) {
        let opts = mapPropsToOptions(props);

        if (newOpts && newOpts.variables) {
          newOpts.variables = assign({}, opts.variables, newOpts.variables);
        }
        if (newOpts) opts = assign({}, opts, newOpts);

        if (opts.fragments) {
          opts.fragments = flatten(opts.fragments);
        }

        if (opts.variables || !operation.variables.length) return opts;

        let variables = {};
        for (let { variable, type } of operation.variables) {
          if (!variable.name || !variable.name.value) continue;

          if (typeof (props as any)[variable.name.value] !== 'undefined') {
            (variables as any)[variable.name.value] = (props as any)[variable.name.value];
            continue;
          }

          // allow optional props
          if (type.kind !== 'NonNullType') {
            (variables as any)[variable.name.value] = null;
            continue;
          }

          invariant(typeof (props as any)[variable.name.value] !== 'undefined',
            `The operation '${operation.name}' wrapping '${getDisplayName(WrappedComponent)}' ` +
            `is expecting a variable: '${variable.name.value}' but it was not found in the props ` +
            `passed to '${graphQLDisplayName}'`
          );
        }
        opts.variables = variables;
        return opts;
      };

      calculateResultProps<T>(result: T) {
        // Ugly, but the hope is to allow typescript to do control-flow analysis
        // to determine if `data` or `mutate` are the keys
        if (operationOptions.name != null) {
          let name = operationOptions.name;
          const newResult = { [name]: result, ownProps: this.props };
          // Prevents us inferring useful type information :/
          if (mapResultToProps) return mapResultToProps<typeof newResult, { [i: string]: any }>(newResult);

          return { [name]: defaultMapResultToProps(result) };
        } else if (this.type === DocumentType.Mutation) {
          const newResult = { mutate: result, ownProps: this.props };
          if (mapResultToProps) return mapResultToProps<typeof newResult, { [i: string]: any }>(newResult);

          return { mutate: defaultMapResultToProps(result) };
        } else {
          const newResult = { data: result, ownProps: this.props };
          if (mapResultToProps) return mapResultToProps<typeof newResult, { [i: string]: any }>(newResult);

          return { data: defaultMapResultToProps(result) };
        }
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
          this.queryObservable = this.client.watchQuery(assign({
            query: document,
            metadata: {
              reactComponent: {
                displayName: graphQLDisplayName,
              },
            },
          }, opts));
        }
      }

      updateQuery(props: T) {
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
      fetchData(): Promise<ApolloQueryResult> | boolean {
        if (this.shouldSkip()) return false;
        if (
          operation.type === DocumentType.Mutation || operation.type === DocumentType.Subscription
        ) return false;

        const opts = this.calculateOptions() as any;
        if (opts.ssr === false) return false;
        if (opts.forceFetch) delete opts.forceFetch; // ignore force fetch in SSR;

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
            clashingKeys.map(k => `'${k}'`).join(', ') + ` not allowed.`
          );

          this.forceRenderChildren();
        };

        const handleError = (error: any) => {
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
          `{ withRef: true } in the options`
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
        const data = assign({}, observableQueryFields(this.queryObservable));

        type ResultData = { [i: string]: any };

        if (this.type === DocumentType.Subscription) {
          return assign(data, {
            loading: !this.lastSubscriptionData,
            variables: opts.variables,
          }, this.lastSubscriptionData as ResultData);

        } else {
          // fetch the current result (if any) from the store
          const currentResult = this.queryObservable.currentResult();
          const { loading, error, networkStatus } = currentResult;
          const dataWithCurrentResult = assign(data, { loading, error, networkStatus });

          if (loading) {
            // while loading, we should use any previous data we have
            return assign(dataWithCurrentResult, this.previousData, currentResult.data as ResultData);
          } else {
            const result = assign(dataWithCurrentResult, currentResult.data as ResultData);
            this.previousData = currentResult.data;
            return result;
          }
        }
      }

      render() {
        if (this.shouldSkip()) {
          return createElement(WrappedComponent as React.ComponentClass<T>, this.props);
        }

        const { shouldRerender, renderedElement, props } = this;
        this.shouldRerender = false;

        const data = this.dataForChild();
        const clientProps = this.calculateResultProps(data);
        const mergedPropsAndData = assign({}, props, clientProps);

        if (!shouldRerender && renderedElement) {
          return renderedElement;
        }

        if (operationOptions.withRef) mergedPropsAndData['ref'] = 'wrappedInstance';
        this.renderedElement = createElement(WrappedComponent as React.ComponentClass<T>, mergedPropsAndData);

        return this.renderedElement;
      }
    }

    // Make sure we preserve any custom statics on the original component.
    hoistNonReactStatics(GraphQL, WrappedComponent, {});

    return GraphQL as typeof WrappedComponent;
  };
};
