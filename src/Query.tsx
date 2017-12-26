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
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';

import shallowEqual from './shallowEqual';
const invariant = require('invariant');
const pick = require('lodash.pick');

import { OperationVariables } from './types';
import { parser, DocumentType } from './parser';

export interface QueryResult {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: OperationVariables;
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions,
  ) => Promise<ApolloQueryResult<any>>;
  refetch: (variables?: OperationVariables) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  updateQuery: (
    mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any,
  ) => void;
}

export interface QueryProps {
  query: DocumentNode;
  variables?: OperationVariables;
  fetchPolicy?: FetchPolicy;
  pollInterval?: number;
  notifyOnNetworkStatusChange?: boolean;
  children: (result: QueryResult) => React.ReactNode;
}

export interface QueryState {
  result: any;
}

function observableQueryFields(observable) {
  const fields = pick(
    observable,
    'variables',
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

class Query extends React.Component<QueryProps, QueryState> {
  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  private client: ApolloClient<any>;
  private queryObservable: ObservableQuery<any>;
  private querySubscription: ZenObservable.Subscription;

  constructor(props, context) {
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
    const result = this.getResult();
    return children(result);
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
      `The <Query /> component requires a graphql query, but got a ${operation.type ===
      DocumentType.Mutation
        ? 'mutation'
        : 'subscription'}.`,
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

  private getResult = () => {
    const { result } = this.state;

    const { loading, error, networkStatus, data } = result;

    const renderProps = {
      data,
      loading,
      error,
      networkStatus,
      ...observableQueryFields(this.queryObservable),
    };

    return renderProps;
  };
}

export default Query;
