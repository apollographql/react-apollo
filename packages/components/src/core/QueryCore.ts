import {
  ApolloClient,
  ApolloQueryResult,
  ObservableQuery,
  ApolloError,
  NetworkStatus
} from 'apollo-client';
import { isEqual } from 'apollo-utilities';
import { parser, DocumentType, ApolloContextValue } from '@apollo/react-common';
import { invariant } from 'ts-invariant';

import {
  QueryProps,
  QueryResult,
  ObservableQueryFields,
  QueryPreviousData,
  QueryCurrentObservable
} from '../types';
import { getClient } from '../utils/getClient';

export class QueryCore<TData, TVariables> {
  public isMounted: boolean = true;
  public previousData: QueryPreviousData<TData> = {};
  public currentObservable: QueryCurrentObservable<TData, TVariables> = {};
  public forceUpdate: any;

  constructor({ forceUpdate }: any) {
    this.forceUpdate = forceUpdate;
  }

  public render(
    props: QueryProps<TData, TVariables>,
    context: ApolloContextValue
  ): React.ReactNode {
    const client = this.currentClient(props, context);

    const { skip, query } = props;
    if (skip || query !== this.previousData.query) {
      this.removeQuerySubscription();
      this.previousData.query = query;
    }

    this.updateObservableQuery(props, context);

    if (!skip) {
      this.startQuerySubscription(props);
    }

    const finish = () => props.children(this.getQueryResult(client, props));
    if (context && context.renderPromises) {
      return context.renderPromises.addQueryPromise(
        this,
        props,
        finish,
        context
      );
    }

    return finish();
  }

  // For server-side rendering (see getDataFromTree.ts)
  public fetchData(
    props: QueryProps<TData, TVariables>,
    context: ApolloContextValue
  ): Promise<ApolloQueryResult<any>> | boolean {
    if (props.skip) return false;

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
    } = props;

    let { fetchPolicy } = opts;
    if (ssr === false) return false;
    if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
      fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
    }

    const obs = this.currentClient(props, context).watchQuery({
      ...opts,
      fetchPolicy
    });

    // Register the SSR observable, so it can be re-used once the value comes back.
    if (context && context.renderPromises) {
      context.renderPromises.registerSSRObservable(obs, props);
    }

    const result = this.currentObservable.query!.getCurrentResult();
    return result.loading ? obs.result() : false;
  }

  public afterRender(
    props: QueryProps<TData, TVariables>,
    prevProps?: QueryProps<TData, TVariables>
  ) {
    this.handleErrorOrCompleted(props, prevProps);
  }

  public cleanup() {
    this.removeQuerySubscription();
  }

  private currentClient(props: QueryProps<TData, TVariables>, context: any) {
    const client = getClient(props, context);
    if (this.previousData.client !== client) {
      this.previousData.client = client;
      this.removeQuerySubscription();
      this.currentObservable.query = null;
      this.previousData.result = null;
    }
    return client;
  }

  private updateCurrentData() {
    if (this.isMounted) {
      this.forceUpdate();
    }
  }

  private extractOptsFromProps(props: QueryProps<TData, TVariables>) {
    const operation = parser(props.query);

    invariant(
      operation.type === DocumentType.Query,
      `The <Query /> component requires a graphql query, but got a ${
        operation.type === DocumentType.Mutation ? 'mutation' : 'subscription'
      }.`
    );

    const displayName = props.displayName || 'Query';

    return {
      ...props,
      displayName,
      context: props.context || {},
      metadata: { reactComponent: { displayName } }
    };
  }

  private observableQueryFields(
    observable: ObservableQuery<TData, TVariables>
  ): ObservableQueryFields<TData, TVariables> {
    const fields = {
      variables: observable.variables,
      refetch: observable.refetch.bind(observable),
      fetchMore: observable.fetchMore.bind(observable),
      updateQuery: observable.updateQuery.bind(observable),
      startPolling: observable.startPolling.bind(observable),
      stopPolling: observable.stopPolling.bind(observable),
      subscribeToMore: observable.subscribeToMore.bind(observable)
    };
    return fields as ObservableQueryFields<TData, TVariables>;
  }

  private initializeObservableQuery(
    props: QueryProps<TData, TVariables>,
    context: ApolloContextValue
  ) {
    // See if there is an existing observable that was used to fetch the same
    // data and if so, use it instead since it will contain the proper queryId
    // to fetch the result set. This is used during SSR.
    if (context && context.renderPromises) {
      this.currentObservable.query = context.renderPromises.getSSRObservable(
        props
      );
    }

    if (!this.currentObservable.query) {
      const options = this.extractOptsFromProps(props);
      this.previousData.options = { ...options, children: null };
      this.currentObservable.query = this.currentClient(
        props,
        context
      ).watchQuery(options);
    }
  }

  private updateObservableQuery(
    props: QueryProps<TData, TVariables>,
    context: ApolloContextValue
  ) {
    // If we skipped initially, we may not have yet created the observable
    if (!this.currentObservable.query) {
      this.initializeObservableQuery(props, context);
    }

    const newOptions = {
      ...this.extractOptsFromProps(props),
      children: null
    };

    if (!isEqual(newOptions, this.previousData.options)) {
      this.previousData.options = newOptions;
      this.currentObservable
        .query!.setOptions(newOptions)
        // The error will be passed to the child container, so we don't
        // need to log it here. We could conceivably log something if
        // an option was set. OTOH we don't log errors w/ the original
        // query. See https://github.com/apollostack/react-apollo/issues/404
        .catch(() => null);
    }
  }

  private startQuerySubscription(props: QueryProps<TData, TVariables>) {
    if (this.currentObservable.subscription) return;

    const obsQuery = this.currentObservable.query!;
    this.currentObservable.subscription = obsQuery.subscribe({
      next: ({ loading, networkStatus, data }) => {
        if (
          this.previousData.result &&
          this.previousData.result.loading === loading &&
          this.previousData.result.networkStatus === networkStatus &&
          isEqual(this.previousData.result.data, data || {})
        ) {
          return;
        }

        this.updateCurrentData();
      },
      error: error => {
        if (
          !this.previousData.result ||
          this.previousData.result.networkStatus === NetworkStatus.refetch
        ) {
          this.resubscribeToQuery(props);
        }

        if (!error.hasOwnProperty('graphQLErrors')) throw error;

        this.updateCurrentData();
      }
    });
  }

  private resubscribeToQuery(props: QueryProps<TData, TVariables>) {
    this.removeQuerySubscription();

    // Unfortunately, if `lastError` is set in the current
    // `observableQuery` when the subscription is re-created,
    // the subscription will immediately receive the error, which will
    // cause it to terminate again. To avoid this, we first clear
    // the last error/result from the `observableQuery` before re-starting
    // the subscription, and restore it afterwards (so the subscription
    // has a chance to stay open).
    const lastError = this.currentObservable.query!.getLastError();
    const lastResult = this.currentObservable.query!.getLastResult();
    this.currentObservable.query!.resetLastResults();
    this.startQuerySubscription(props);
    Object.assign(this.currentObservable.query!, {
      lastError,
      lastResult
    });
  }

  private getQueryResult(
    client: ApolloClient<object>,
    props: QueryProps<TData, TVariables>
  ): QueryResult<TData, TVariables> {
    let result = {
      data: Object.create(null) as TData
    } as any;

    // Attach bound methods
    Object.assign(
      result,
      this.observableQueryFields(this.currentObservable.query!)
    );

    // When skipping a query (ie. we're not querying for data but still want
    // to render children), make sure the `data` is cleared out and
    // `loading` is set to `false` (since we aren't loading anything).
    if (props.skip) {
      result = {
        ...result,
        data: undefined,
        error: undefined,
        loading: false
      };
    } else {
      // Fetch the current result (if any) from the store.
      const currentResult = this.currentObservable.query!.getCurrentResult();
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
        const previousData = this.previousData.result
          ? this.previousData.result.data
          : {};
        Object.assign(result.data, previousData, data);
      } else if (error) {
        Object.assign(result, {
          data: (this.currentObservable.query!.getLastResult() || ({} as any))
            .data
        });
      } else {
        const { fetchPolicy } = this.currentObservable.query!.options;
        const { partialRefetch } = props;
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
            networkStatus: NetworkStatus.loading
          });
          result.refetch();
          return result;
        }

        Object.assign(result.data, data);
      }
    }

    result.client = client;
    this.previousData.loading =
      (this.previousData.result && this.previousData.result.loading) || false;
    this.previousData.result = result;
    return result;
  }

  private handleErrorOrCompleted(
    props: QueryProps<TData, TVariables>,
    prevProps?: QueryProps<TData, TVariables>
  ) {
    const {
      data,
      loading,
      error
    } = this.currentObservable.query!.getCurrentResult();

    if (!loading) {
      const { query, variables, onCompleted, onError } = props;

      // No changes, so we won't call onError/onCompleted.
      if (
        prevProps &&
        isEqual(prevProps.query, query) &&
        isEqual(prevProps.variables, variables) &&
        !this.previousData.loading
      ) {
        return;
      }

      if (onCompleted && !error) {
        onCompleted(data as TData);
      } else if (onError && error) {
        onError(error);
      }
    }
  }

  private removeQuerySubscription() {
    if (this.currentObservable.subscription) {
      this.currentObservable.subscription.unsubscribe();
      delete this.currentObservable.subscription;
    }
  }
}
