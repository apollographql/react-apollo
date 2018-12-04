import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  ObservableQuery,
  ApolloError,
  FetchPolicy,
  ErrorPolicy,
  ApolloQueryResult,
  NetworkStatus,
  FetchMoreOptions,
  FetchMoreQueryOptions,
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables, GraphqlQueryControls, QueryOpts } from './types';
import { parser, DocumentType, IDocumentDefinition } from './parser';
import { getClient } from './component-utils';
import { RenderPromises } from './getDataFromTree';

const shallowEqual = require('fbjs/lib/shallowEqual');
const invariant = require('invariant');

export type ObservableQueryFields<TData, TVariables> = Pick<
  ObservableQuery<TData, TVariables>,
  'startPolling' | 'stopPolling' | 'subscribeToMore' | 'updateQuery' | 'refetch' | 'variables'
> & {
  fetchMore: (<K extends keyof TVariables>(
    fetchMoreOptions: FetchMoreQueryOptions<TVariables, K> & FetchMoreOptions<TData, TVariables>,
  ) => Promise<ApolloQueryResult<TData>>) &
    (<TData2, TVariables2, K extends keyof TVariables2>(
      fetchMoreOptions: { query: DocumentNode } & FetchMoreQueryOptions<TVariables2, K> &
        FetchMoreOptions<TData2, TVariables2>,
    ) => Promise<ApolloQueryResult<TData2>>);
};

function compact(obj: any) {
  return Object.keys(obj).reduce(
    (acc, key) => {
      if (obj[key] !== undefined) {
        acc[key] = obj[key];
      }

      return acc;
    },
    {} as any,
  );
}

function observableQueryFields<TData, TVariables>(
  observable: ObservableQuery<TData>,
): ObservableQueryFields<TData, TVariables> {
  const fields = {
    variables: observable.variables,
    refetch: observable.refetch.bind(observable),
    fetchMore: observable.fetchMore.bind(observable),
    updateQuery: observable.updateQuery.bind(observable),
    startPolling: observable.startPolling.bind(observable),
    stopPolling: observable.stopPolling.bind(observable),
    subscribeToMore: observable.subscribeToMore.bind(observable),
  };
  // TODO: Need to cast this because we improved the type of `updateQuery` to be parametric
  // on variables, while the type in Apollo client just has object.
  // Consider removing this when that is properly typed
  return fields as ObservableQueryFields<TData, TVariables>;
}

export interface QueryResult<TData = any, TVariables = OperationVariables>
  extends ObservableQueryFields<TData, TVariables> {
  client: ApolloClient<any>;
  // we create an empty object to make checking for data
  // easier for consumers (i.e. instead of data && data.user
  // you can just check data.user) this also makes destructring
  // easier (i.e. { data: { user } })
  // however, this isn't realy possible with TypeScript that
  // I'm aware of. So intead we enforce checking for data
  // like so result.data!.user. This tells TS to use TData
  // XXX is there a better way to do this?
  data: TData | undefined;
  error?: ApolloError;
  loading: boolean;
  networkStatus: NetworkStatus;
}

export interface QueryProps<TData = any, TVariables = OperationVariables> extends QueryOpts<TVariables> {
  children: (result: QueryResult<TData, TVariables>) => React.ReactNode;
  query: DocumentNode;
  displayName?: string;
  skip?: boolean;
  onCompleted?: (data: TData | {}) => void;
  onError?: (error: ApolloError) => void;
}

export interface QueryContext {
  client?: ApolloClient<Object>;
  operations?: Map<string, { query: DocumentNode; variables: any }>;
  renderPromises?: RenderPromises;
}

export default class Query<TData = any, TVariables = OperationVariables> extends React.Component<
  QueryProps<TData, TVariables>
> {
  static contextTypes = {
    client: PropTypes.object,
    operations: PropTypes.object,
    renderPromises: PropTypes.object,
  };

  static propTypes = {
    client: PropTypes.object,
    children: PropTypes.func.isRequired,
    fetchPolicy: PropTypes.string,
    notifyOnNetworkStatusChange: PropTypes.bool,
    onCompleted: PropTypes.func,
    onError: PropTypes.func,
    pollInterval: PropTypes.number,
    query: PropTypes.object.isRequired,
    variables: PropTypes.object,
    ssr: PropTypes.bool,
    partialRefetch: PropTypes.bool,
  };

  context: QueryContext | undefined;

  private client: ApolloClient<Object>;

  // request / action storage. Note that we delete querySubscription if we
  // unsubscribe but never delete queryObservable once it is created. We
  // only delete queryObservable when we unmount the component.
  private queryObservable?: ObservableQuery<TData> | null;
  private querySubscription?: ZenObservable.Subscription;
  private previousData: any = {};
  private refetcherQueue?: {
    args: any;
    resolve: (value?: any | PromiseLike<any>) => void;
    reject: (reason?: any) => void;
  };

  private hasMounted: boolean = false;
  private operation?: IDocumentDefinition;

  constructor(props: QueryProps<TData, TVariables>, context: QueryContext) {
    super(props, context);

    this.client = getClient(props, context);
    this.initializeQueryObservable(props);
  }

  // For server-side rendering (see getDataFromTree.ts)
  fetchData(): Promise<ApolloQueryResult<any>> | boolean {
    if (this.props.skip) return false;

    // pull off react options
    const {
      children,
      ssr,
      displayName,
      skip,
      client,
      onCompleted,
      onError,
      partialRefetch,
      ...opts
    } = this.props;

    let { fetchPolicy } = opts;
    if (ssr === false) return false;
    if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
      fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
    }

    const observable = this.client.watchQuery({
      ...opts,
      fetchPolicy,
    });
    const result = this.queryObservable!.currentResult();

    return result.loading ? observable.result() : false;
  }

  componentDidMount() {
    this.hasMounted = true;
    if (this.props.skip) return;

    this.startQuerySubscription();
    if (this.refetcherQueue) {
      const { args, resolve, reject } = this.refetcherQueue;
      this.queryObservable!.refetch(args)
        .then(resolve)
        .catch(reject);
    }
  }

  componentWillReceiveProps(nextProps: QueryProps<TData, TVariables>, nextContext: QueryContext) {
    // the next render wants to skip
    if (nextProps.skip && !this.props.skip) {
      this.removeQuerySubscription();
      return;
    }

    const nextClient = getClient(nextProps, nextContext);

    if (shallowEqual(this.props, nextProps) && this.client === nextClient) {
      return;
    }

    if (this.client !== nextClient) {
      this.client = nextClient;
      this.removeQuerySubscription();
      this.queryObservable = null;
      this.previousData = {};
      this.updateQuery(nextProps);
    }

    if (this.props.query !== nextProps.query) {
      this.removeQuerySubscription();
    }

    this.updateQuery(nextProps);
    if (nextProps.skip) return;
    this.startQuerySubscription();
  }

  componentWillUnmount() {
    this.removeQuerySubscription();
    this.hasMounted = false;
  }

  componentDidUpdate() {
    const { onCompleted, onError } = this.props;
    if (onCompleted || onError) {
      const currentResult = this.queryObservable!.currentResult();
      const { loading, error, data } = currentResult;
      if (onCompleted && !loading && !error) {
        onCompleted(data);
      } else if (onError && !loading && error) {
        onError(error);
      }
    }
  }

  render(): React.ReactNode {
    const { context } = this;
    const finish = () => this.props.children(this.getQueryResult());
    if (context && context.renderPromises) {
      return context.renderPromises.addQueryPromise(this, finish);
    }
    return finish();
  }

  private extractOptsFromProps(props: QueryProps<TData, TVariables>) {
    const {
      variables,
      pollInterval,
      fetchPolicy,
      errorPolicy,
      notifyOnNetworkStatusChange,
      query,
      displayName = 'Query',
      context = {},
    } = props;

    this.operation = parser(query);

    invariant(
      this.operation.type === DocumentType.Query,
      `The <Query /> component requires a graphql query, but got a ${
        this.operation.type === DocumentType.Mutation ? 'mutation' : 'subscription'
      }.`,
    );

    return compact({
      variables,
      pollInterval,
      query,
      fetchPolicy,
      errorPolicy,
      notifyOnNetworkStatusChange,
      metadata: { reactComponent: { displayName } },
      context,
    });
  }

  private initializeQueryObservable(props: QueryProps<TData, TVariables>) {
    const opts = this.extractOptsFromProps(props);
    // save for backwards compat of refetcherQueries without a recycler
    this.setOperations(opts);
    this.queryObservable = this.client.watchQuery(opts);
  }

  private setOperations(props: QueryProps<TData, TVariables>) {
    if (this.context!.operations) {
      this.context!.operations!.set(this.operation!.name, {
        query: props.query,
        variables: props.variables,
      });
    }
  }

  private updateQuery(props: QueryProps<TData, TVariables>) {
    // if we skipped initially, we may not have yet created the observable
    if (!this.queryObservable) {
      this.initializeQueryObservable(props);
    } else {
      this.setOperations(props);
    }

    this.queryObservable!.setOptions(this.extractOptsFromProps(props))
      // The error will be passed to the child container, so we don't
      // need to log it here. We could conceivably log something if
      // an option was set. OTOH we don't log errors w/ the original
      // query. See https://github.com/apollostack/react-apollo/issues/404
      .catch(() => null);
  }

  private startQuerySubscription = () => {
    if (this.querySubscription) return;
    // store the initial renders worth of result
    let initial: QueryResult<TData, TVariables> | undefined = this.getQueryResult();
    this.querySubscription = this.queryObservable!.subscribe({
      next: ({ data }) => {
        // to prevent a quick second render from the subscriber
        // we compare to see if the original started finished (from cache) and is unchanged
        if (initial && initial.networkStatus === 7 && shallowEqual(initial.data, data)) {
          initial = undefined;
          return;
        }

        initial = undefined;
        this.updateCurrentData();
      },
      error: error => {
        this.resubscribeToQuery();
        // Quick fix for https://github.com/apollostack/react-apollo/issues/378
        if (!error.hasOwnProperty('graphQLErrors')) throw error;

        this.updateCurrentData();
      },
    });
  };

  private removeQuerySubscription = () => {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
      delete this.querySubscription;
    }
  };

  private resubscribeToQuery() {
    this.removeQuerySubscription();

    const lastError = this.queryObservable!.getLastError();
    const lastResult = this.queryObservable!.getLastResult();
    // If lastError is set, the observable will immediately
    // send it, causing the stream to terminate on initialization.
    // We clear everything here and restore it afterward to
    // make sure the new subscription sticks.
    this.queryObservable!.resetLastResults();
    this.startQuerySubscription();
    Object.assign(this.queryObservable!, { lastError, lastResult });
  }

  private updateCurrentData = () => {
    // force a rerender that goes through shouldComponentUpdate
    if (this.hasMounted) this.forceUpdate();
  };

  private getQueryResult = (): QueryResult<TData, TVariables> => {
    let data = { data: Object.create(null) as TData } as any;
    // Attach bound methods
    Object.assign(data, observableQueryFields(this.queryObservable!));

    // When skipping a query (ie. we're not querying for data but still want
    // to render children), make sure the `data` is cleared out and
    // `loading` is set to `false` (since we aren't loading anything).
    if (this.props.skip) {
      data = {
        ...data,
        data: undefined,
        error: undefined,
        loading: false,
      };
    } else {
      // Fetch the current result (if any) from the store.
      const currentResult = this.queryObservable!.currentResult();
      const { loading, partial, networkStatus, errors } = currentResult;
      let { error } = currentResult;

      // Until a set naming convention for networkError and graphQLErrors is
      // decided upon, we map errors (graphQLErrors) to the error props.
      if (errors && errors.length > 0) {
        error = new ApolloError({ graphQLErrors: errors });
      }

      Object.assign(data, { loading, networkStatus, error });

      if (loading) {
        Object.assign(data.data, this.previousData, currentResult.data);
      } else if (error) {
        Object.assign(data, {
          data: (this.queryObservable!.getLastResult() || {}).data,
        });
      } else {
        const { fetchPolicy } = this.queryObservable!.options;
        const { partialRefetch } = this.props;
        if (
          partialRefetch &&
          Object.keys(currentResult.data).length === 0 &&
          partial &&
          fetchPolicy !== 'cache-only'
        ) {
          // When a `Query` component is mounted, and a mutation is executed
          // that returns the same ID as the mounted `Query`, but has less
          // fields in its result, Apollo Client's `QueryManager` returns the
          // data as an empty Object since a hit can't be found in the cache.
          // This can lead to application errors when the UI elements rendered by
          // the original `Query` component are expecting certain data values to
          // exist, and they're all of a sudden stripped away. To help avoid
          // this we'll attempt to refetch the `Query` data.
          Object.assign(data, { loading: true, networkStatus: NetworkStatus.loading });
          data.refetch();
          return data;
        }

        Object.assign(data.data, currentResult.data);
        this.previousData = currentResult.data;
      }
    }

    // Handle race condition where refetch is called on child mount or later
    // Normal execution model:
    // render(loading) -> mount -> start subscription -> get data -> render(with data)
    //
    // SSR with synchronous refetch:
    // render(with data) -> refetch -> mount -> start subscription
    //
    // SSR with asynchronous refetch:
    // render(with data) -> mount -> start subscription -> refetch
    //
    // If a subscription has not started, then the synchronous call to refetch
    // must be made at a time when an active network request is being made, so
    // we ensure that the network requests are deduped, to avoid an
    // inconsistent UI state that displays different data for the current query
    // alongside a refetched query.
    //
    // Once the Query component is mounted and the subscription is made, we
    // always hit the network with refetch, since the components data will be
    // updated and a network request is not currently active.
    if (!this.querySubscription) {
      const oldRefetch = (data as GraphqlQueryControls).refetch;

      (data as GraphqlQueryControls).refetch = args => {
        if (this.querySubscription) {
          return oldRefetch(args);
        } else {
          return new Promise((r, f) => {
            this.refetcherQueue = { resolve: r, reject: f, args };
          });
        }
      };
    }

    data.client = this.client;
    return data;
  };
}
