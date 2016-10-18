import {
  Component,
  createElement,
  PropTypes,
} from 'react';

// modules don't export ES6 modules
import pick = require('lodash.pick');
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

const defaultQueryData = {
  loading: true,
  error: null,
};
const skippedQueryData = {
  loading: false,
  error: null,
};

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
  return hoistNonReactStatics(WithApollo, WrappedComponent, { fetchData: true });
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
      if (mapPropsToSkip(props)) return false;
      if (
        operation.type === DocumentType.Mutation || operation.type === DocumentType.Subscription
      ) return false;

      const opts = calculateOptions(props) as any;
      if (opts.ssr === false || opts.skip) return false;

      const observable = client.watchQuery(assign({ query: document }, opts));
      const result = observable.currentResult();

      if (result.loading) {
        return observable.result();
      } else {
        return false;
      }
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

      // request / action storage. Note that we delete querySubscription if we
      // unsubscribe but never delete queryObservable once it is created.
      private queryObservable: ObservableQuery | any;
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

        if (mapPropsToSkip(props)) return;
        this.setInitialProps();
      }

      componentDidMount() {
        this.hasMounted = true;
        if (this.type === DocumentType.Mutation) return;

        if (mapPropsToSkip(this.props)) return;
        this.subscribeToQuery(this.props);
      }

      componentWillReceiveProps(nextProps) {
        if (mapPropsToSkip(nextProps)) {
          if (!mapPropsToSkip(this.props)) {
            // if this has changed, remove data and unsubscribeFromQuery
            this.data = assign({}, skippedQueryData) as any;
            this.unsubscribeFromQuery();
          }
          return;
        }
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
        if (this.type === DocumentType.Subscription) this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      calculateOptions(props, newProps?) { return calculateOptions(props, newProps); };

      calculateResultProps(result) {
        let name = this.type === DocumentType.Mutation ? 'mutate' : 'data';
        if (operationOptions.name) name = operationOptions.name;

        const newResult = { [name]: result, ownProps: this.props };
        if (mapResultToProps) return mapResultToProps(newResult);

        return { [name]: defaultMapResultToProps(result) };
      }

      setInitialProps() {
        if (this.type === DocumentType.Mutation) return this.createWrappedMutation(this.props);

        // Create the observable but don't subscribe yet. The query won't
        // fire until we do.
        const opts: QueryOptions = this.calculateOptions(this.props);

        if (opts.skip) {
          this.data = assign({}, skippedQueryData) as any;
        } else {
          this.data = assign({}, defaultQueryData) as any;
          this.createQuery(opts);
        }
      }

      createQuery(opts: QueryOptions) {
        if (this.type === DocumentType.Subscription) {
          this.queryObservable = this.client.subscribe(assign({
            query: document,
          }, opts));
        } else {
          this.queryObservable = this.client.watchQuery(assign({
            query: document,
          }, opts));
        }

        this.initializeData(opts);
      }

      initializeData(opts: QueryOptions) {
        assign(this.data, observableQueryFields(this.queryObservable));

        if (this.type === DocumentType.Subscription) {
          opts = this.calculateOptions(this.props, opts);
          assign(this.data, { loading: true }, { variables: opts.variables });
        } else if (!opts.forceFetch) {
          const currentResult = this.queryObservable.currentResult();
          // try and fetch initial data from the store
          assign(this.data, currentResult.data, { loading: currentResult.loading });
        } else {
          assign(this.data, { loading: true });
        }
      }

      subscribeToQuery(props): boolean {
        const opts = calculateOptions(props) as QueryOptions;

        if (opts.skip) {
          if (this.querySubscription) {
            this.hasOperationDataChanged = true;
            this.data = assign({}, skippedQueryData) as any;
            this.unsubscribeFromQuery();
            this.forceRenderChildren();
          }
          return;
        }

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

          // Ensure we are up-to-date with the latest state of the world
          assign(this.data,
            { loading: this.queryObservable.currentResult().loading },
            observableQueryFields(this.queryObservable)
          );

          return;
        }

        // if we skipped initially, we may not have yet created the observable
        if (!this.queryObservable) {
          this.createQuery(opts);
        } else if (!this.data.refetch) {
          // we've run this query before, but then we've skipped it (resetting
          // data to skippedQueryData) and now we're unskipping it. Make sure
          // the data fields are set as if we hadn't run it.
          this.initializeData(opts);
        }

        const next = (results: any) => {
          if (this.type === DocumentType.Subscription) {
            results = { data: results, loading: false, error: null };
          }
          const { data, loading, error = null } = results;
          const clashingKeys = Object.keys(observableQueryFields(data));
          invariant(clashingKeys.length === 0,
            `the result of the '${graphQLDisplayName}' operation contains keys that ` +
            `conflict with the return object.` +
            clashingKeys.map(k => `'${k}'`).join(', ') + ` not allowed.`
          );

          this.hasOperationDataChanged = true;
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
      }

      unsubscribeFromQuery() {
        if (this.querySubscription) {
          (this.querySubscription as Subscription).unsubscribe();
          delete this.querySubscription;
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
        if (mapPropsToSkip(this.props)) return createElement(WrappedComponent, this.props);

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
    return hoistNonReactStatics(GraphQL, WrappedComponent, { fetchData: true });
  };

};
