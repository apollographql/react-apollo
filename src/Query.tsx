import * as React from 'react';
import ApolloClient, {
  ObservableQuery,
  ApolloQueryResult,
  ApolloError,
  FetchPolicy,
  ErrorPolicy,
  ApolloCurrentResult,
  NetworkStatus,
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables } from './types';
import { parser, DocumentType } from './parser';
import ApolloConsumer from "./ApolloConsumer";

const pick = require('lodash/pick');
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
  'startPolling' | 'stopPolling'
> & {
  refetch: (variables?: TVariables) => Promise<ApolloQueryResult<TData>>;
  fetchMore: (<K extends keyof TVariables>(
    fetchMoreOptions: FetchMoreQueryOptions<TVariables, K> &
      FetchMoreOptions<TData, TVariables>,
  ) => Promise<ApolloQueryResult<TData>>) &
    (<TData2, TVariables2, K extends keyof TVariables2>(
      fetchMoreOptions: { query: DocumentNode } & FetchMoreQueryOptions<
        TVariables2,
        K
      > &
        FetchMoreOptions<TData2, TVariables2>,
    ) => Promise<ApolloQueryResult<TData2>>);
  updateQuery: (
    mapFn: (
      previousQueryResult: TData,
      options: { variables?: TVariables },
    ) => TData,
  ) => void;
};

function observableQueryFields<TData, TVariables>(
  observable: ObservableQuery<TData>,
): ObservableQueryFields<TData, TVariables> {
  const fields = pick(
    observable,
    'refetch',
    'fetchMore',
    'updateQuery',
    'startPolling',
    'stopPolling',
  );

  Object.keys(fields).forEach(key => {
    const k = key as
      | 'refetch'
      | 'fetchMore'
      | 'updateQuery'
      | 'startPolling'
      | 'stopPolling';
    if (typeof fields[k] === 'function') {
      fields[k] = fields[k].bind(observable);
    }
  });

  // TODO: Need to cast this because we improved the type of `updateQuery` to be parametric
  // on variables, while the type in Apollo client just has object.
  // Consider removing this when that is properly typed
  return fields as ObservableQueryFields<TData, TVariables>;
}

function isDataFilled<TData>(data: {} | TData): data is TData {
  return Object.keys(data).length > 0;
}

export interface QueryResult<TData = any, TVariables = OperationVariables>
  extends ObservableQueryFields<TData, TVariables> {
  client: ApolloClient<any>;
  data?: TData;
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
}

export type QueryPropsWithClient<TData = any, TVariables = OperationVariables> = QueryProps<TData, TVariables> & { client: ApolloClient<any> };

export interface QueryState<TData = any> {
  result: ApolloCurrentResult<TData>;
}

class Query<
  TData = any,
  TVariables = OperationVariables
> extends React.Component<QueryPropsWithClient<TData, TVariables>, QueryState<TData>> {
  
  private queryObservable: ObservableQuery<TData>;
  private querySubscription: ZenObservable.Subscription;
  private previousData: any = {};

  constructor(props: QueryPropsWithClient<TData, TVariables>) {
    super(props);

    this.initializeQueryObservable(props);
    this.state = {
      result: this.queryObservable.currentResult(),
    };
  }

  // For server-side rendering (see getDataFromTree.ts)
  fetchData(): Promise<ApolloQueryResult<any>> | boolean {
    const { client, children, ssr, ...opts } = this.props;

    let { fetchPolicy } = opts;
    if (ssr === false) return false;
    if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
      fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
    }

    const observable = client.watchQuery({
      ...opts,
      fetchPolicy,
    });
    const result = this.queryObservable.currentResult();

    if (result.loading) {
      return observable.result();
    } else {
      return false;
    }
  }

  componentDidMount() {
    this.startQuerySubscription();
  }

  componentWillReceiveProps(nextProps: QueryPropsWithClient<TData, TVariables>) {
    if (
      shallowEqual(this.props, nextProps)
    ) {
      return;
    }

    this.removeQuerySubscription();
    this.initializeQueryObservable(nextProps);
    this.startQuerySubscription();
    this.updateCurrentData();
  }

  componentWillUnmount() {
    this.removeQuerySubscription();
  }

  render() {
    const { children } = this.props;
    const queryResult = this.getQueryResult();
    return children(queryResult);
  }

  private initializeQueryObservable = (
    props: QueryPropsWithClient<TData, TVariables>,
  ) => {
    const {
      variables,
      pollInterval,
      fetchPolicy,
      errorPolicy,
      notifyOnNetworkStatusChange,
      query,
      client
    } = props;

    const operation = parser(query);

    invariant(
      operation.type === DocumentType.Query,
      `The <Query /> component requires a graphql query, but got a ${
        operation.type === DocumentType.Mutation ? 'mutation' : 'subscription'
      }.`,
    );

    const clientOptions = {
      variables,
      pollInterval,
      query,
      fetchPolicy,
      errorPolicy,
      notifyOnNetworkStatusChange,
    };

    this.queryObservable = client.watchQuery(clientOptions);
  };

  private startQuerySubscription = () => {
    this.querySubscription = this.queryObservable.subscribe({
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
    }
  };

  private resubscribeToQuery() {
    this.removeQuerySubscription();

    const lastError = this.queryObservable.getLastError();
    const lastResult = this.queryObservable.getLastResult();
    // If lastError is set, the observable will immediately
    // send it, causing the stream to terminate on initialization.
    // We clear everything here and restore it afterward to
    // make sure the new subscription sticks.
    this.queryObservable.resetLastResults();
    this.startQuerySubscription();
    Object.assign(this.queryObservable, { lastError, lastResult });
  }

  private updateCurrentData = () => {
    this.setState({ result: this.queryObservable.currentResult() });
  };

  private getQueryResult = (): QueryResult<TData, TVariables> => {
    const { result } = this.state;
    const { client } = this.props;
    
    const { loading, networkStatus, errors } = result;
    let { error } = result;
    // until a set naming convention for networkError and graphQLErrors is decided upon, we map errors (graphQLErrors) to the error props
    if (errors && errors.length > 0) {
      error = new ApolloError({ graphQLErrors: errors });
    }
    let data = {} as any;

    if (loading) {
      Object.assign(data, this.previousData, result.data);
    } else if (error) {
      Object.assign(data, (this.queryObservable.getLastResult() || {}).data);
    } else {
      data = result.data;
      this.previousData = result.data;
    }

    return {
      client,
      data: isDataFilled(data) ? data : undefined,
      loading,
      error,
      networkStatus,
      ...observableQueryFields(this.queryObservable),
    };
  };
}

class QueryWithClient<TData = any, TVariables = OperationVariables> extends React.Component<QueryProps<TData, TVariables>> {
  render() {
    return (
      <ApolloConsumer>
        {client => (
          <Query {...this.props} client={client} />
        )}
      </ApolloConsumer>
    )
  }
};

export default QueryWithClient;
