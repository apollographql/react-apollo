import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  ObservableQuery,
  ApolloQueryResult,
  ApolloError,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';

import shallowEqual from './shallowEqual';
const invariant = require('invariant');
const pick = require('lodash.pick');

import { QueryOpts, OperationVariables } from './types';
import { parser, DocumentType } from './parser';

export interface QueryRenderProp {
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
  options?: QueryOpts;
  skip?: Boolean;
  loading?: () => React.ReactNode;
  error?: (error: ApolloError) => React.ReactNode;
  render?: ((result: QueryRenderProp) => React.ReactNode);
  children?: ((result: QueryRenderProp) => React.ReactNode) | React.ReactNode;
}

export interface QueryState {
  result: any;
}

const isEmptyChildren = children => React.Children.count(children) === 0;

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
  private client: ApolloClient<any>;
  private queryObservable: ObservableQuery<any>;
  private querySubscription: ZenObservable.Subscription;

  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

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
    if (this.props.skip) {
      return;
    }
    this.startQuerySubscription();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (
      shallowEqual(this.props, nextProps) &&
      this.client === nextContext.client
    ) {
      return;
    }

    if (nextProps.skip) {
      if (!this.props.skip) {
        this.removeQuerySubscription();
      }
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

  private initializeQueryObservable = props => {
    const { options, query } = props;

    const operation = parser(query);

    invariant(
      operation.type === DocumentType.Query,
      `The <Query /> component requires a graphql query, but got a ${operation.type ===
      DocumentType.Mutation
        ? 'mutation'
        : 'subscription'}.`,
    );

    const clientOptions = { ...options, query };

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

  getRenderProps = () => {
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

  render() {
    const { render, loading, error, children } = this.props;
    const result = this.getRenderProps();

    if (result.loading && loading) {
      return loading();
    }

    if (result.error && error) {
      return error(result.error);
    }

    if (render) {
      return render(result);
    }

    if (typeof children === 'function') {
      return children(result);
    }

    if (children && !isEmptyChildren(children))
      return React.Children.only(children);

    return null;
  }
}

export default Query;
