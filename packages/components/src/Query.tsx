import React from 'react';
import PropTypes from 'prop-types';
import ApolloClient, {
  ObservableQuery,
  ApolloError,
  ApolloQueryResult,
  NetworkStatus,
  FetchMoreOptions,
  FetchMoreQueryOptions,
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import {
  getApolloContext,
  ApolloContextValue,
  parser,
  DocumentType,
  IDocumentDefinition,
} from '@apollo/react-common';
import isEqual from 'lodash.isequal';
import { invariant } from 'ts-invariant';

import { OperationVariables, QueryOpts } from './types';
import { getClient } from './utils/getClient';
import shallowEqual from './utils/shallowEqual';

export type ObservableQueryFields<TData, TVariables> = Pick<
  ObservableQuery<TData, TVariables>,
  | 'startPolling'
  | 'stopPolling'
  | 'subscribeToMore'
  | 'updateQuery'
  | 'refetch'
  | 'variables'
> & {
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
};

function observableQueryFields<TData, TVariables>(
  observable: ObservableQuery<TData, TVariables>,
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

export interface QueryProps<TData = any, TVariables = OperationVariables>
  extends QueryOpts<TVariables> {
  children: (result: QueryResult<TData, TVariables>) => React.ReactNode;
  query: DocumentNode;
  displayName?: string;
  skip?: boolean;
  onCompleted?: (data: TData) => void;
  onError?: (error: ApolloError) => void;
}

export class Query<
  TData = any,
  TVariables = OperationVariables
> extends React.Component<QueryProps<TData, TVariables>> {
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

  private previousClient?: ApolloClient<Object>;

  // Note that we delete `observableQuerySubscription` if we unsubscribe but
  // never delete `observableQuery` once it is created. We only delete
  // `observableQuery` when we unmount the component.
  private observableQuery?: ObservableQuery<TData, TVariables> | null;
  private observableQuerySubscription?: ZenObservable.Subscription;

  private previousQuery?: DocumentNode;
  private hasMounted: boolean = false;
  private operation?: IDocumentDefinition;
  private previousOptions: {} | null = null;
  private previousResult: ApolloQueryResult<TData> | null = null;

  componentDidMount() {
    this.hasMounted = true;
  }

  componentDidUpdate(prevProps: QueryProps<TData, TVariables>) {
    const isDiffRequest =
      !isEqual(prevProps.query, this.props.query) ||
      !isEqual(prevProps.variables, this.props.variables);
    if (isDiffRequest) {
      // If specified, `onError` / `onCompleted` callbacks are called here
      // after local cache results are loaded.
      this.handleErrorOrCompleted();
    }
  }

  componentWillUnmount() {
    this.removeQuerySubscription();
    this.hasMounted = false;
  }

  render(): React.ReactNode {
    const ApolloContext = getApolloContext();
    return (
      <ApolloContext.Consumer>
        {(context: ApolloContextValue) => {
          return this.renderData(context);
        }}
      </ApolloContext.Consumer>
    );
  }

  // For server-side rendering (see getDataFromTree.ts)
  fetchData(
    client: ApolloClient<object>,
    context: ApolloContextValue,
  ): Promise<ApolloQueryResult<any>> | boolean {
    if (this.props.skip) return false;

    // pull off react options
    const {
      children,
      ssr,
      displayName,
      skip,
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

    const observable = client.watchQuery({
      ...opts,
      fetchPolicy,
    });

    // Register the SSR observable, so it can be re-used once the value comes back.
    if (context && context.renderPromises) {
      context.renderPromises.registerSSRObservable(this, observable);
    }

    const result = this.observableQuery!.getCurrentResult();
    return result.loading ? observable.result() : false;
  }

  private extractOptsFromProps(props: QueryProps<TData, TVariables>) {
    this.operation = parser(props.query);

    invariant(
      this.operation.type === DocumentType.Query,
      `The <Query /> component requires a graphql query, but got a ${
        this.operation.type === DocumentType.Mutation
          ? 'mutation'
          : 'subscription'
      }.`,
    );

    const displayName = props.displayName || 'Query';

    return {
      ...props,
      displayName,
      context: props.context || {},
      metadata: { reactComponent: { displayName } },
    };
  }

  private initializeObservableQuery(
    client: ApolloClient<object>,
    props: QueryProps<TData, TVariables>,
    context: ApolloContextValue,
  ) {
    // See if there is an existing observable that was used to fetch the same data and
    // if so, use it instead since it will contain the proper queryId to fetch
    // the result set. This is used during SSR.
    if (context && context.renderPromises) {
      this.observableQuery = context.renderPromises.getSSRObservable(this);
    }

    if (!this.observableQuery) {
      const options = this.extractOptsFromProps(props);
      this.previousOptions = { ...options, children: null };
      this.observableQuery = client.watchQuery(options);
    }
  }

  private updateObservableQuery(
    client: ApolloClient<object>,
    context: ApolloContextValue,
  ) {
    // if we skipped initially, we may not have yet created the observable
    if (!this.observableQuery) {
      this.initializeObservableQuery(client, this.props, context);
    }

    const newOptions = {
      ...this.extractOptsFromProps(this.props),
      children: null,
    };

    if (!isEqual(newOptions, this.previousOptions)) {
      this.previousOptions = newOptions;
      this.observableQuery!.setOptions(newOptions)
        // The error will be passed to the child container, so we don't
        // need to log it here. We could conceivably log something if
        // an option was set. OTOH we don't log errors w/ the original
        // query. See https://github.com/apollostack/react-apollo/issues/404
        .catch(() => null);
    }
  }

  private startQuerySubscription = (client: ApolloClient<object>) => {
    if (this.observableQuerySubscription) return;

    this.observableQuerySubscription = this.observableQuery!.subscribe({
      next: ({ loading, networkStatus, data }) => {
        const { previousResult } = this;
        if (
          previousResult &&
          previousResult.loading === loading &&
          previousResult.networkStatus === networkStatus &&
          shallowEqual(previousResult.data, data || {})
        ) {
          return;
        }

        this.updateCurrentData();
      },
      error: error => {
        const { previousResult } = this;
        if (
          !previousResult ||
          previousResult.networkStatus === NetworkStatus.refetch
        ) {
          this.resubscribeToQuery(client);
        }

        if (!error.hasOwnProperty('graphQLErrors')) throw error;
        this.updateCurrentData();
      },
    });
  };

  private removeQuerySubscription = () => {
    if (this.observableQuerySubscription) {
      this.observableQuerySubscription.unsubscribe();
      delete this.observableQuerySubscription;
    }
  };

  private resubscribeToQuery(client: ApolloClient<object>) {
    this.removeQuerySubscription();

    // Unfortunately, if `lastError` is set in the current
    // `observableQuery` when the subscription is re-created,
    // the subscription will immediately receive the error, which will
    // cause it to terminate again. To avoid this, we first clear
    // the last error/result from the `observableQuery` before re-starting
    // the subscription, and restore it afterwards (so the subscription
    // has a chance to stay open).
    const lastError = this.observableQuery!.getLastError();
    const lastResult = this.observableQuery!.getLastResult();
    this.observableQuery!.resetLastResults();
    this.startQuerySubscription(client);
    Object.assign(this.observableQuery!, { lastError, lastResult });
  }

  private updateCurrentData = () => {
    // If specified, `onError` / `onCompleted` callbacks are called here
    // after a network based Query result has been received.
    this.handleErrorOrCompleted();

    if (this.hasMounted) this.forceUpdate();
  };

  private handleErrorOrCompleted = () => {
    const result = this.observableQuery!.getCurrentResult();
    const { data, loading, error } = result;
    const { onCompleted, onError } = this.props;
    if (onCompleted && !loading && !error) {
      onCompleted(data as TData);
    } else if (onError && !loading && error) {
      onError(error);
    }
  };

  private getQueryResult = (
    client: ApolloClient<object>,
  ): QueryResult<TData, TVariables> => {
    let result = {
      data: Object.create(null) as TData,
    } as any;

    // Attach bound methods
    Object.assign(result, observableQueryFields(this.observableQuery!));

    // When skipping a query (ie. we're not querying for data but still want
    // to render children), make sure the `data` is cleared out and
    // `loading` is set to `false` (since we aren't loading anything).
    if (this.props.skip) {
      result = {
        ...result,
        data: undefined,
        error: undefined,
        loading: false,
      };
    } else {
      // Fetch the current result (if any) from the store.
      const currentResult = this.observableQuery!.getCurrentResult();
      const { loading, partial, networkStatus, errors } = currentResult;
      let { error, data } = currentResult;
      data = data || (Object.create(null) as TData);

      // Until a set naming convention for networkError and graphQLErrors is
      // decided upon, we map errors (graphQLErrors) to the error props.
      if (errors && errors.length > 0) {
        error = new ApolloError({ graphQLErrors: errors });
      }

      Object.assign(result, { loading, networkStatus, error });

      if (loading) {
        const previousData = this.previousResult
          ? this.previousResult.data
          : {};
        Object.assign(result.data, previousData, data);
      } else if (error) {
        Object.assign(result, {
          data: (this.observableQuery!.getLastResult() || {}).data,
        });
      } else {
        const { fetchPolicy } = this.observableQuery!.options;
        const { partialRefetch } = this.props;
        if (
          partialRefetch &&
          Object.keys(data).length === 0 &&
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
          Object.assign(result, {
            loading: true,
            networkStatus: NetworkStatus.loading,
          });
          result.refetch();
          return result;
        }

        Object.assign(result.data, data);
      }
    }

    result.client = client;
    this.previousResult = result;
    return result;
  };

  private currentClient(context: any) {
    const client = getClient(this.props, context);
    if (this.previousClient !== client) {
      this.previousClient = client;
      this.removeQuerySubscription();
      this.observableQuery = null;
      this.previousResult = null;
    }
    return client;
  }

  private renderData(context: ApolloContextValue): React.ReactNode {
    const client = this.currentClient(context);

    const { skip, query } = this.props;
    if (skip || query !== this.previousQuery) {
      this.removeQuerySubscription();
      this.observableQuery = null;
      this.previousQuery = query;
    }

    this.updateObservableQuery(client, context);

    if (!skip) {
      this.startQuerySubscription(client);
    }

    const finish = () => this.props.children(this.getQueryResult(client));
    if (context && context.renderPromises) {
      return context.renderPromises.addQueryPromise(
        this,
        finish,
        client,
        context,
      );
    }
    return finish();
  }
}
