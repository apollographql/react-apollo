import * as React from 'react';
import * as PropTypes from 'prop-types';
import shallowEqual from './shallowEqual';
import ApolloClient, {
  ObservableQuery,
  ApolloQueryResult,
} from 'apollo-client';
import { ZenObservable } from 'zen-observable-ts';
import { parser, DocumentType } from './parser';
import { DocumentNode } from 'graphql';
import {
  MutationOpts,
  ChildProps,
  OperationOption,
  QueryOpts,
  QueryProps,
  MutationFunc,
  OptionProps,
} from './types';

const invariant = require('invariant');
const assign = require('object-assign');
const pick = require('lodash.pick');
const hoistNonReactStatics = require('hoist-non-react-statics');

const defaultMapPropsToOptions = () => ({});
const defaultMapResultToProps = props => props;
const defaultMapPropsToSkip = () => false;

// the fields we want to copy over to our data prop
function observableQueryFields(observable) {
  const fields = pick(
    observable,
    'variables',
    'refetch',
    'fetchMore',
    'updateQuery',
    'startPolling',
    'stopPolling',
    'subscribeToMore',
  );

  Object.keys(fields).forEach(key => {
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

export default function graphql<
  TProps = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = ChildProps<TProps, TData, TGraphQLVariables>
>(
  document: DocumentNode,
  operationOptions: OperationOption<TProps, TData, TGraphQLVariables> = {},
) {
  // extract options
  const {
    options = defaultMapPropsToOptions,
    skip = defaultMapPropsToSkip,
    alias = 'Apollo',
  } = operationOptions;

  let mapPropsToOptions = options as (props: any) => QueryOpts | MutationOpts;
  if (typeof mapPropsToOptions !== 'function')
    mapPropsToOptions = () => options as QueryOpts | MutationOpts;

  let mapPropsToSkip = skip as (props: any) => boolean;
  if (typeof mapPropsToSkip !== 'function') mapPropsToSkip = () => skip as any;

  const mapResultToProps = operationOptions.props;

  // safety check on the operation
  const operation = parser(document);

  // Helps track hot reloading.
  const version = nextVersion++;

  function wrapWithApolloComponent<TOriginalProps extends TChildProps>(
    WrappedComponent: React.ComponentType<TOriginalProps>,
  ) {
    const graphQLDisplayName = `${alias}(${getDisplayName(WrappedComponent)})`;

    class GraphQL extends React.Component<
      TOriginalProps & TGraphQLVariables,
      void
    > {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;
      static contextTypes = {
        client: PropTypes.object,
        getQueryRecycler: PropTypes.func,
      };

      // react / redux and react dev tools (HMR) needs
      public props: any; // passed props
      public version: number;
      public hasMounted: boolean;

      // data storage
      private client: ApolloClient<any>; // apollo client
      private type: DocumentType;

      // request / action storage. Note that we delete querySubscription if we
      // unsubscribe but never delete queryObservable once it is created. We
      // only delete queryObservable when we unmount the component.
      private queryObservable: ObservableQuery<any> | any;
      private querySubscription: ZenObservable.Subscription;
      private previousData: any = {};
      private lastSubscriptionData: any;
      private refetcherQueue: {
        args: any;
        resolve: (value?: {} | PromiseLike<{}>) => void;
        reject: (reason?: any) => void;
      };

      // calculated switches to control rerenders
      private shouldRerender: boolean;

      // the element to render
      private renderedElement: any;

      // wrapped instance
      private wrappedInstance: any;

      constructor(props, context) {
        super(props, context);

        this.version = version;
        this.type = operation.type;
        this.dataForChildViaMutation = this.dataForChildViaMutation.bind(this);
        this.setWrappedInstance = this.setWrappedInstance.bind(this);
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
          // call any stacked refetch functions
          if (this.refetcherQueue) {
            const { args, resolve, reject } = this.refetcherQueue;
            this.queryObservable
              .refetch(args)
              .then(resolve)
              .catch(reject);
          }
        }
      }

      componentWillReceiveProps(nextProps, nextContext) {
        if (this.shouldSkip(nextProps)) {
          if (!this.shouldSkip(this.props)) {
            // if this has changed, we better unsubscribe
            this.unsubscribeFromQuery();
          }
          return;
        }

        const { client } = mapPropsToOptions(nextProps);

        if (
          shallowEqual(this.props, nextProps) &&
          (this.client === client || this.client === nextContext.client)
        ) {
          return;
        }

        this.shouldRerender = true;

        if (this.client !== client && this.client !== nextContext.client) {
          if (client) {
            this.client = client;
          } else {
            this.client = nextContext.client;
          }
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
        }
        if (
          this.type === DocumentType.Subscription &&
          operationOptions.shouldResubscribe &&
          operationOptions.shouldResubscribe(this.props, nextProps)
        ) {
          this.unsubscribeFromQuery();
          delete this.queryObservable;
          this.updateQuery(nextProps);
          this.subscribeToQuery();
          return;
        }

        this.updateQuery(nextProps);
        this.subscribeToQuery();
      }

      componentWillUnmount() {
        if (this.type === DocumentType.Query) {
          // Recycle the query observable if there ever was one.
          if (this.queryObservable) {
            const recycler = this.getQueryRecycler();
            if (recycler) {
              recycler.recycle(this.queryObservable);
              delete this.queryObservable;
            }
          }

          // It is critical that this happens prior to recyling the query
          // if not it breaks the loading state / network status because
          // an orphan observer is created in AC (intended) which is cleaned up
          // when the browser has time via a setTimeout(0)
          // Unsubscribe from our query subscription.
          this.unsubscribeFromQuery();
        }

        if (this.type === DocumentType.Subscription)
          this.unsubscribeFromQuery();

        this.hasMounted = false;
      }

      getQueryRecycler() {
        return (
          this.context.getQueryRecycler &&
          this.context.getQueryRecycler(GraphQL)
        );
      }

      getClient<Cache>(props): ApolloClient<Cache> {
        if (this.client) return this.client;
        const { client } = mapPropsToOptions(props);

        if (client) {
          this.client = client;
        } else {
          this.client = this.context.client;
        }

        invariant(
          !!this.client,
          `Could not find "client" in the context of ` +
            `"${graphQLDisplayName}". ` +
            `Wrap the root component in an <ApolloProvider>`,
        );

        return this.client;
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

          invariant(
            typeof props[variable.name.value] !== 'undefined',
            `The operation '${operation.name}' wrapping '${getDisplayName(
              WrappedComponent,
            )}' ` +
              `is expecting a variable: '${
                variable.name.value
              }' but it was not found in the props ` +
              `passed to '${graphQLDisplayName}'`,
          );
        }
        opts = { ...opts, variables };
        return opts;
      }

      calculateResultProps(result: (QueryProps & TData) | MutationFunc<TData>) {
        let name = this.type === DocumentType.Mutation ? 'mutate' : 'data';
        if (operationOptions.name) name = operationOptions.name;

        const newResult: OptionProps<TProps & TGraphQLVariables, TData> = {
          [name]: result,
          ownProps: this.props,
        };
        if (mapResultToProps) return mapResultToProps(newResult);

        return { [name]: defaultMapResultToProps(result) };
      }

      setInitialProps() {
        if (this.type === DocumentType.Mutation) {
          return;
        }

        // Create the observable but don't subscribe yet. The query won't
        // fire until we do.
        const opts: QueryOpts = this.calculateOptions(this.props);

        this.createQuery(opts);
      }

      createQuery(opts: QueryOpts, props: any = this.props) {
        if (this.type === DocumentType.Subscription) {
          this.queryObservable = this.getClient(props).subscribe(
            assign({ query: document }, opts),
          );
        } else {
          // Try to reuse an `ObservableQuery` instance from our recycler. If
          // we get null then there is no instance to reuse and we should
          // create a new `ObservableQuery`. Otherwise we will use our old one.
          const recycler = this.getQueryRecycler();
          let queryObservable = null;
          if (recycler) queryObservable = recycler.reuse(opts);

          if (queryObservable === null) {
            this.queryObservable = this.getClient(props).watchQuery(
              assign(
                {
                  query: document,
                  metadata: {
                    reactComponent: {
                      displayName: graphQLDisplayName,
                    },
                  },
                },
                opts,
              ),
            );
          } else {
            this.queryObservable = queryObservable;
          }
        }
      }

      updateQuery(props) {
        const opts = this.calculateOptions(props) as QueryOpts;

        // if we skipped initially, we may not have yet created the observable
        if (!this.queryObservable) {
          this.createQuery(opts, props);
        }

        if (this.queryObservable._setOptionsNoResult) {
          // Since we don't care about the result, use a hacky version to
          // work around https://github.com/apollostack/apollo-client/pull/694
          // This workaround is only present in Apollo Client 0.4.21
          this.queryObservable._setOptionsNoResult(opts);
        } else {
          if (this.queryObservable.setOptions) {
            this.queryObservable
              .setOptions(opts)
              // The error will be passed to the child container, so we don't
              // need to log it here. We could conceivably log something if
              // an option was set. OTOH we don't log errors w/ the original
              // query. See https://github.com/apollostack/react-apollo/issues/404
              .catch(() => null);
          }
        }
      }

      // For server-side rendering (see server.ts)
      fetchData(): Promise<ApolloQueryResult<any>> | boolean {
        if (this.shouldSkip()) return false;
        if (
          operation.type === DocumentType.Mutation ||
          operation.type === DocumentType.Subscription
        )
          return false;

        const opts = this.calculateOptions() as any;
        if (opts.ssr === false) return false;
        if (
          opts.fetchPolicy === 'network-only' ||
          opts.fetchPolicy === 'cache-and-network'
        ) {
          opts.fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
        }

        const observable = this.getClient(this.props).watchQuery(
          assign({ query: document }, opts),
        );
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
          }
          const clashingKeys = Object.keys(observableQueryFields(results.data));
          invariant(
            clashingKeys.length === 0,
            `the result of the '${graphQLDisplayName}' operation contains ` +
              `keys that conflict with the return object.` +
              clashingKeys.map(k => `'${k}'`).join(', ') +
              ` not allowed.`,
          );

          this.forceRenderChildren();
        };

        const handleError = error => {
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
        this.querySubscription = this.queryObservable.subscribe({
          next,
          error: handleError,
        });
      }

      unsubscribeFromQuery() {
        if (this.querySubscription) {
          (this.querySubscription as ZenObservable.Subscription).unsubscribe();
          delete this.querySubscription;
        }
      }

      shouldSkip(props = this.props) {
        return mapPropsToSkip(props);
      }

      forceRenderChildren() {
        // force a rerender that goes through shouldComponentUpdate
        this.shouldRerender = true;
        if (this.hasMounted) this.forceUpdate();
      }

      getWrappedInstance() {
        invariant(
          operationOptions.withRef,
          `To access the wrapped instance, you need to specify ` +
            `{ withRef: true } in the options`,
        );

        return this.wrappedInstance;
      }

      setWrappedInstance(ref) {
        this.wrappedInstance = ref;
      }

      dataForChildViaMutation(mutationOpts: MutationOpts) {
        const opts = this.calculateOptions(this.props, mutationOpts);

        if (typeof opts.variables === 'undefined') delete opts.variables;

        (opts as any).mutation = document;
        return this.getClient(this.props).mutate(opts as any) as Promise<
          ApolloQueryResult<TData>
        >;
      }

      dataForChild() {
        if (this.type === DocumentType.Mutation) {
          return this.dataForChildViaMutation;
        }

        const opts = this.calculateOptions(this.props);
        const data = {};
        assign(data, observableQueryFields(this.queryObservable));

        if (this.type === DocumentType.Subscription) {
          assign(
            data,
            {
              loading: !this.lastSubscriptionData,
              variables: opts.variables,
            },
            this.lastSubscriptionData && this.lastSubscriptionData.data,
          );
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
              console.error(
                `Unhandled (in react-apollo:${graphQLDisplayName})`,
                error.stack || error,
              );
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
          } else if (error) {
            // if there is error, use any previously cached data
            assign(data, (this.queryObservable.getLastResult() || {}).data);
          } else {
            assign(data, currentResult.data);
            this.previousData = currentResult.data;
          }

          // handle race condition where refetch is called on child mount
          if (!this.querySubscription) {
            (data as QueryProps).refetch = args => {
              return new Promise((r, f) => {
                this.refetcherQueue = { resolve: r, reject: f, args };
              });
            };
          }
        }
        return data as QueryProps & TData;
      }

      render() {
        if (this.shouldSkip()) {
          if (operationOptions.withRef) {
            return React.createElement(
              WrappedComponent,
              assign({}, this.props, { ref: this.setWrappedInstance }),
            );
          }
          return React.createElement(WrappedComponent, this.props);
        }

        const { shouldRerender, renderedElement, props } = this;
        this.shouldRerender = false;

        if (
          !shouldRerender &&
          renderedElement &&
          renderedElement.type === WrappedComponent
        ) {
          return renderedElement;
        }

        const data = this.dataForChild();
        const clientProps = this.calculateResultProps(data);
        const mergedPropsAndData = assign({}, props, clientProps);

        if (operationOptions.withRef)
          mergedPropsAndData.ref = this.setWrappedInstance;
        this.renderedElement = React.createElement(
          WrappedComponent,
          mergedPropsAndData,
        );
        return this.renderedElement;
      }
    }

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  }

  return wrapWithApolloComponent;
}
