import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  ObservableQuery,
  ApolloQueryResult,
  ApolloError,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  FetchPolicy,
  ApolloCurrentResult,
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables } from './types';
import { parser, DocumentType } from './parser';

const shallowEqual = require('fbjs/lib/shallowEqual');
const invariant = require('invariant');
const pick = require('lodash/pick');

function observableQueryFields(observable) {
  const fields = pick(
    observable,
    'refetch',
    'fetchMore',
    'updateQuery',
    'startPolling',
    'stopPolling',
  );

  Object.keys(fields).forEach(key => {
    if (typeof fields[key] === 'function') {
      fields[key] = fields[key].bind(observable);
    }
  });

  return fields;
}

export interface QueryResult<TData = any> {
  client: ApolloClient<any>;
  data: TData;
  error?: ApolloError;
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions,
  ) => Promise<ApolloQueryResult<any>>;
  loading: boolean;
  networkStatus: number;
  refetch: (variables?: OperationVariables) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  updateQuery: (
    mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any,
  ) => void;
}

export interface QueryProps<TData = any> {
  children: (result: QueryResult<TData>) => React.ReactNode;
  fetchPolicy?: FetchPolicy;
  notifyOnNetworkStatusChange?: boolean;
  pollInterval?: number;
  query: DocumentNode;
  variables?: OperationVariables;
  ssr?: boolean;
}

export interface QueryState<TData = any> {
  result: ApolloCurrentResult<TData>;
}

class Query<TData = any> extends React.Component<
  QueryProps<TData>,
  QueryState<TData>
> {
  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  state: QueryState<TData>;
  private client: ApolloClient<any>;
  private queryObservable: ObservableQuery<TData>;
  private querySubscription: ZenObservable.Subscription;

  constructor(props: QueryProps<TData>, context: any) {
    super(props, context);

    invariant(
      !!context.client,
      `Could not find "client" in the context of Query. Wrap the root component in an <ApolloProvider>`,
    );
    this.client = context.client;

    this.initializeQueryObservable(props);
    this.state = {
      result: this.queryObservable.currentResult(),
    };
  }

  // For server-side rendering (see getDataFromTree.ts)
  fetchData(): Promise<ApolloQueryResult<any>> | boolean {
    const { children, ssr, ...opts } = this.props;

    let { fetchPolicy } = opts;
    if (ssr === false) return false;
    if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
      fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
    }

    const observable = this.client.watchQuery({
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

  componentWillReceiveProps(nextProps, nextContext) {
    if (
      shallowEqual(this.props, nextProps) &&
      this.client === nextContext.client
    ) {
      return;
    }

    if (this.client !== nextContext.client) {
      this.client = nextContext.client;
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

  private initializeQueryObservable = props => {
    const {
      variables,
      pollInterval,
      fetchPolicy,
      notifyOnNetworkStatusChange,
      query,
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
      notifyOnNetworkStatusChange,
    };

    this.queryObservable = this.client.watchQuery(clientOptions);
  };

  private startQuerySubscription = () => {
    this.querySubscription = this.queryObservable.subscribe({
      next: this.updateCurrentData,
      error: this.updateCurrentData,
    });
  };

  private removeQuerySubscription = () => {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
  };

  private updateCurrentData = () => {
    this.setState({ result: this.queryObservable.currentResult() });
  };

  private getQueryResult = (): QueryResult<TData> => {
    const { result } = this.state;
    const { loading, error, networkStatus, data } = result;
    return {
      client: this.client,
      data,
      loading,
      error,
      networkStatus,
      ...observableQueryFields(this.queryObservable),
    };
  };
}

export default Query;
