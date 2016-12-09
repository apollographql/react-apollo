import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
import pick = require('lodash.pick');
import flatten = require('lodash.flatten');
import shallowEqual from './shallowEqual';

import invariant = require('invariant');
import assign = require('object-assign');

import hoistNonReactStatics = require('hoist-non-react-statics');

import ApolloClient, {
  ApolloError,
  ObservableQuery,
  MutationBehavior,
  MutationQueryReducersMap,
  Subscription,
  ApolloStore,
  ApolloQueryResult,
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
  // deprecated
  skip?: boolean;
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
  return hoistNonReactStatics(WithApollo, WrappedComponent, {});
};

export interface OperationOption {
  options?: Object | ((props: any) => QueryOptions | MutationOptions);
  props?: (props: any) => any;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
}

export default function graphql(
  document: Document,
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
  return function wrapWithApolloComponent(WrappedComponent) {

    const graphQLDisplayName = `Apollo(${getDisplayName(WrappedComponent)})`;

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
      // unsubscribe but never delete queryObservable once it is created.
      private queryObservable: ObservableQuery | any;
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
          this.subscribeToQuery(this.props);
        }
      }

      componentWillReceiveProps(nextProps) {
        if (shallowEqual(this.props, nextProps)) return;

        this.shouldRerender = true;

        if (this.type === DocumentType.Mutation) {
          return;
        };

        if (this.shouldSkip(nextProps)) {
          if (!this.shouldSkip(this.props)) {
            // if this has changed, we better unsubscribe
            this.unsubscribeFromQuery();
          }
          return;
        }

        // we got new props, we need to unsubscribe and re-subscribe with the new data
        this.subscribeToQuery(nextProps);
      }

      shouldComponentUpdate(nextProps, nextState, nextContext) {
        return !!nextContext || this.shouldRerender;
      }

      componentWillUnmount() {
        if (this.type === DocumentType.Query) this.unsubscribeFromQuery();
        if (this.type === DocumentType.Subscription) this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      calculateOptions(props = this.props, newOpts?) {
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

      subscribeToQuery(props): boolean {
        const opts = this.calculateOptions(props) as QueryOptions;

        // We've subscribed already, just update with our new options and
        // take the latest result
        if (this.querySubscription) {
          if (this.queryObservable._setOptionsNoResult) {
            // Since we don't care about the result, use a hacky version to
            // work around https://github.com/apollostack/apollo-client/pull/694
            // This workaround is only present in Apollo Client 0.4.21
            this.queryObservable._setOptionsNoResult(opts);
          } else {
            this.queryObservable.setOptions(opts);
          }

          return;
        }

        // if we skipped initially, we may not have yet created the observable
        if (!this.queryObservable) {
          this.createQuery(opts);
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
          assign(data, { loading, error, networkStatus });

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

        if (!shouldRerender && renderedElement) {
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

};
