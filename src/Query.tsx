import * as React from 'react';
import ApolloClient, {
  ObservableQuery,
  ApolloError,
  FetchPolicy,
  ErrorPolicy,
  ApolloQueryResult,
  NetworkStatus,
} from 'apollo-client';
import { print, DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables, GraphqlQueryControls } from './types';
import { parser, DocumentType, IDocumentDefinition } from './parser';
import { ApolloConsumer as Consumer } from './Context';

const shallowEqual = require('fbjs/lib/shallowEqual');
const invariant = require('invariant');

// Improved FetchMoreOptions type, need to port them back to Apollo Client
export interface FetchMoreOptions<TData, TVariables> {
  updateQuery: (
    previousQueryResult: TData,
    options: {
      fetchMoreResult?: TData;
      variables: TVariables;
    },
  ) => TData;
}

// Improved FetchMoreQueryOptions type, need to port them back to Apollo Client
export interface FetchMoreQueryOptions<TVariables, K extends keyof TVariables> {
  variables: Pick<TVariables, K>;
}

// XXX open types improvement PR to AC
// Improved ObservableQuery field types, need to port them back to Apollo Client
export type ObservableQueryFields<TData, TVariables> = Pick<
  ObservableQuery<TData>,
  'startPolling' | 'stopPolling' | 'subscribeToMore'
> & {
  variables: TVariables;
  refetch: (variables?: TVariables) => Promise<ApolloQueryResult<TData>>;
  fetchMore: (<K extends keyof TVariables>(
    fetchMoreOptions: FetchMoreQueryOptions<TVariables, K> & FetchMoreOptions<TData, TVariables>,
  ) => Promise<ApolloQueryResult<TData>>) &
    (<TData2, TVariables2, K extends keyof TVariables2>(
      fetchMoreOptions: { query: DocumentNode } & FetchMoreQueryOptions<TVariables2, K> &
        FetchMoreOptions<TData2, TVariables2>,
    ) => Promise<ApolloQueryResult<TData2>>);
  updateQuery: (
    mapFn: (previousQueryResult: TData, options: { variables?: TVariables }) => TData,
  ) => void;
};

function compact(obj: any) {
  return Object.keys(obj).reduce(
    (acc, key) => {
      if (obj[key] !== undefined) acc[key] = obj[key];
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
  data: TData | undefined;
  error?: ApolloError;
  loading: boolean;
  networkStatus: NetworkStatus;
}

export interface QueryProps<TData = any, TVariables = OperationVariables> {
  children: (result: QueryResult<TData, TVariables>) => React.ReactNode;
  fetchPolicy?: FetchPolicy;
  errorPolicy?: ErrorPolicy;
  notifyOnNetworkStatusChange?: boolean;
  pollInterval?: number;
  query: DocumentNode;
  variables?: TVariables;
  ssr?: boolean;
  displayName?: string;
  skip?: boolean;
  client?: ApolloClient<Object>;
  context?: Record<string, any>;
  suspend?: boolean;
}

export interface InnerQueryProps<TData = any, TVariables = OperationVariables>
  extends QueryProps<TData, TVariables> {
  client: ApolloClient<any>;
}

const pickObservedProps = (props: QueryProps<any, any>) => {
  const {
    fetchPolicy,
    errorPolicy,
    notifyOnNetworkStatusChange,
    pollInterval,
    query,
    variables,
    skip,
    client,
    context,
    suspend,
  } = props;
  return {
    fetchPolicy,
    errorPolicy,
    notifyOnNetworkStatusChange,
    pollInterval,
    query,
    variables,
    skip,
    client,
    context,
    suspend,
  };
};

const extractOptsFromProps = (props: QueryProps<any, any>) => {
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

  const operation = parser(query);

  invariant(
    operation.type === DocumentType.Query,
    `The <Query /> component requires a graphql query, but got a ${
      operation.type === DocumentType.Mutation ? 'mutation' : 'subscription'
    }.`,
  );

  return compact({
    variables,
    pollInterval,
    query,
    fetchPolicy,
    errorPolicy,
    notifyOnNetworkStatusChange,
    context,
    metadata: { reactComponent: { displayName } },
  });
};

const initializeQueryObservable = (props: InnerQueryProps<any, any>) =>
  props.client.watchQuery(extractOptsFromProps(props));

const updateQuery = (props: InnerQueryProps<any, any>, state: QueryState<any>) => {
  // if we skipped initially, we may not have yet created the observable
  let queryObservable = state.queryObservable;
  if (!queryObservable) queryObservable = initializeQueryObservable(props);

  queryObservable
    .setOptions(extractOptsFromProps(props))
    // The error will be passed to the child container, so we don't
    // need to log it here. We could conceivably log something if
    // an option was set. OTOH we don't log errors w/ the original
    // query. See https://github.com/apollostack/react-apollo/issues/404
    .catch(() => null);

  return queryObservable;
};

export interface QueryState<TData> {
  queryObservable: ObservableQuery<TData> | null;
  evictData?: boolean;
  // XXX pass through typings here
  props?: any;
}
class Query<TData = any, TVariables = OperationVariables> extends React.Component<
  InnerQueryProps<TData, TVariables>,
  QueryState<TData>
> {
  private client: ApolloClient<Object>;

  // request / action storage. Note that we delete querySubscription if we
  // unsubscribe but never delete queryObservable once it is created. We
  // only delete queryObservable when we unmount the component.
  private querySubscription: ZenObservable.Subscription;
  private previousData: any = {};
  private refetcherQueue: {
    args: any;
    resolve: (value?: any | PromiseLike<any>) => void;
    reject: (reason?: any) => void;
  };

  private hasMounted: boolean;
  private operation: IDocumentDefinition;

  constructor(props: InnerQueryProps<TData, TVariables>) {
    super(props);

    this.state = {
      queryObservable: initializeQueryObservable(props),
      props: pickObservedProps(props),
    } as any;
  }

  // For server-side rendering (see getDataFromTree.ts)
  fetchData(): Promise<ApolloQueryResult<any>> | boolean {
    if (this.props.skip) return false;
    // pull off react options
    const { children, ssr, displayName, skip, client, suspend, ...opts } = this.props;

    let { fetchPolicy } = opts;
    if (ssr === false) return false;
    if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
      fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
    }

    const observable = this.props.client.watchQuery({
      ...opts,
      fetchPolicy,
    });
    const result = this.state.queryObservable!.currentResult();

    return result.loading ? observable.result() : false;
  }

  componentDidMount() {
    this.hasMounted = true;
    if (this.props.skip) return;
    this.startQuerySubscription(this.state.queryObservable);
    if (this.refetcherQueue) {
      const { args, resolve, reject } = this.refetcherQueue;
      this.state
        .queryObservable!.refetch(args)
        .then(resolve)
        .catch(reject);
    }
  }

  static getDerivedStateFromProps(nextProps: QueryProps<TData, TVariables>, prevState) {
    const props = pickObservedProps(nextProps);
    // if we aren't working from a live query, we can just ignore props changes
    if (!prevState.queryObservable) return { props };

    // if there are no changes to the props, don't do anything state wise
    if (shallowEqual(pickObservedProps(nextProps), prevState.props)) return null;

    if (nextProps.skip) return { props };

    prevState.evictData = false;

    // remove the queryObservable so cDU will have to create a new one
    if (nextProps.client !== prevState.props.client || nextProps.query !== prevState.props.query) {
      prevState.evictData = true;
      prevState.queryObservable = null;
    }

    // update the ObservableQuery
    prevState.queryObservable = updateQuery(nextProps, prevState);
    prevState.props = props;

    return prevState;
  }

  componentDidUpdate(prevProps: InnerQueryProps<TData, TVariables>) {
    // the next render wants to skip
    if (this.props.skip && !prevProps.skip) {
      this.removeQuerySubscription();
      return;
    }

    // if there are no changes to the props, don't do anything state wise
    if (shallowEqual(this.props, prevProps)) return null;

    // if the client or the actual operation changed, we need to clean up the subscription
    if (this.props.client !== prevProps.client || this.props.query !== prevProps.query) {
      this.previousData = {};
      this.removeQuerySubscription();
    }

    if (!this.props.skip) {
      // start a new subscription if we don't have one already
      this.startQuerySubscription(this.state.queryObservable);
    }
  }

  componentWillUnmount() {
    this.removeQuerySubscription();
    this.hasMounted = false;
  }

  render() {
    return this.props.children(this.getQueryResult(this.state));
  }

  private startQuerySubscription = (queryObservable: ObservableQuery<TData> | null) => {
    if (this.querySubscription || !queryObservable) return;
    this.querySubscription = queryObservable.subscribe({
      next: this.updateCurrentData,
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

    const queryObservable = this.state.queryObservable!;
    // probably need to move this to state
    const lastError = queryObservable.getLastError();
    const lastResult = queryObservable!.getLastResult();
    // If lastError is set, the observable will immediately
    // send it, causing the stream to terminate on initialization.
    // We clear everything here and restore it afterward to
    // make sure the new subscription sticks.
    queryObservable!.resetLastResults();
    this.startQuerySubscription(queryObservable);
    Object.assign(queryObservable!, { lastError, lastResult });
  }

  private updateCurrentData = () => {
    if (this.hasMounted) this.forceUpdate();
  };

  private getQueryResult = ({
    queryObservable,
    evictData,
  }: QueryState<TData>): QueryResult<TData, TVariables> => {
    let data = { data: Object.create(null) as TData } as any;
    // attach bound methods
    Object.assign(data, observableQueryFields(queryObservable!));
    // fetch the current result (if any) from the store
    const currentResult = queryObservable!.currentResult();
    const { loading, networkStatus, errors } = currentResult;
    let { error } = currentResult;
    // until a set naming convention for networkError and graphQLErrors is decided upon, we map errors (graphQLErrors) to the error props
    if (errors && errors.length > 0) {
      error = new ApolloError({ graphQLErrors: errors });
    }

    Object.assign(data, { loading, networkStatus, error });

    if (evictData) this.previousData = {};
    if (loading) {
      // only throw if we are still in a loading state
      if (this.props.suspend) {
        // async mode wants to throw a promise that waits for the data to be loaded
        throw this.state.queryObservable!.result();
      }
      Object.assign(data.data, this.previousData, currentResult.data);
    } else if (error) {
      Object.assign(data, {
        data: (queryObservable!.getLastResult() || {}).data,
      });
    } else {
      Object.assign(data.data, currentResult.data);
      this.previousData = currentResult.data;
    }
    // handle race condition where refetch is called on child mount
    if (!this.querySubscription) {
      (data as GraphqlQueryControls).refetch = args => {
        return new Promise((r, f) => {
          this.refetcherQueue = { resolve: r, reject: f, args };
        });
      };
    }

    data.client = this.props.client;

    return data;
  };
}

export default class ApolloQuery<TData = any, TVariables = any> extends React.Component<
  QueryProps<TData, any>
> {
  render() {
    return <Consumer>{client => <Query client={client} {...this.props} />}</Consumer>;
  }
}
