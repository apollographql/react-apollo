import {
  ApolloQueryResult,
  ObservableQuery,
  ApolloError,
  NetworkStatus
} from 'apollo-client';
import { isEqual } from 'apollo-utilities';
import {
  ApolloContextValue,
  DocumentType,
  QueryResult,
  ObservableQueryFields
} from '@apollo/react-common';

import {
  QueryPreviousData,
  QueryOptions,
  QueryCurrentObservable
} from '../types';
import { OperationData } from './OperationData';

export class QueryData<TData, TVariables> extends OperationData {
  private previousData: QueryPreviousData<TData, TVariables> = {};
  private currentObservable: QueryCurrentObservable<TData, TVariables> = {};
  private forceUpdate: any;

  constructor({
    options,
    context,
    forceUpdate
  }: {
    options: QueryOptions<TData, TVariables>;
    context: ApolloContextValue;
    forceUpdate: any;
  }) {
    super(options, context);
    this.forceUpdate = forceUpdate;
  }

  public execute(): QueryResult<TData, TVariables> {
    this.refreshClient();

    const { skip, query } = this.getOptions();
    if (skip || query !== this.previousData.query) {
      this.removeQuerySubscription();
      this.previousData.query = query;
    }

    this.updateObservableQuery();

    if (!skip) {
      this.startQuerySubscription();
    }

    const finish = () => this.getQueryResult();
    if (this.context && this.context.renderPromises) {
      const result = this.context.renderPromises.addQueryPromise(this, finish);
      return result || { loading: true, networkStatus: NetworkStatus.loading };
    }

    return finish();
  }

  // For server-side rendering
  public fetchData(): Promise<ApolloQueryResult<any>> | boolean {
    if (this.getOptions().skip) return false;

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
    } = this.getOptions();

    let { fetchPolicy } = opts;
    if (ssr === false) return false;
    if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
      fetchPolicy = 'cache-first'; // ignore force fetch in SSR;
    }

    const obs = this.refreshClient().client.watchQuery({
      ...opts,
      fetchPolicy
    });

    // Register the SSR observable, so it can be re-used once the value comes back.
    if (this.context && this.context.renderPromises) {
      this.context.renderPromises.registerSSRObservable(obs, this.getOptions());
    }

    const result = this.currentObservable.query!.getCurrentResult();
    return result.loading ? obs.result() : false;
  }

  public afterExecute() {
    this.isMounted = true;
    this.handleErrorOrCompleted();
    return this.unmount.bind(this);
  }

  public cleanup() {
    this.removeQuerySubscription();
    this.currentObservable.query = null;
    this.previousData.result = null;
  }

  private updateCurrentData() {
    if (this.isMounted) {
      this.forceUpdate();
    }
  }

  private prepareObservableQueryOptions() {
    this.verifyDocumentType(this.getOptions().query, DocumentType.Query);
    const displayName = this.getOptions().displayName || 'Query';

    return {
      ...this.getOptions(),
      displayName,
      context: this.getOptions().context || {},
      metadata: { reactComponent: { displayName } }
    };
  }

  private observableQueryFields(
    observable: ObservableQuery<TData, TVariables>
  ): ObservableQueryFields<TData, TVariables> {
    return {
      variables: observable.variables,
      refetch: observable.refetch.bind(observable),
      fetchMore: observable.fetchMore.bind(observable),
      updateQuery: observable.updateQuery.bind(observable),
      startPolling: observable.startPolling.bind(observable),
      stopPolling: observable.stopPolling.bind(observable),
      subscribeToMore: observable.subscribeToMore.bind(observable)
    } as ObservableQueryFields<TData, TVariables>;
  }

  private initializeObservableQuery() {
    // See if there is an existing observable that was used to fetch the same
    // data and if so, use it instead since it will contain the proper queryId
    // to fetch the result set. This is used during SSR.
    if (this.context && this.context.renderPromises) {
      this.currentObservable.query = this.context.renderPromises.getSSRObservable(
        this.getOptions()
      );
    }

    if (!this.currentObservable.query) {
      const observableQueryOptions = this.prepareObservableQueryOptions();
      this.previousData.observableQueryOptions = {
        ...observableQueryOptions,
        children: null
      };
      this.currentObservable.query = this.refreshClient().client.watchQuery(
        observableQueryOptions
      );
    }
  }

  private updateObservableQuery() {
    // If we skipped initially, we may not have yet created the observable
    if (!this.currentObservable.query) {
      this.initializeObservableQuery();
    }

    const newObservableQueryOptions = {
      ...this.prepareObservableQueryOptions(),
      children: null
    };

    if (
      !isEqual(
        newObservableQueryOptions,
        this.previousData.observableQueryOptions
      )
    ) {
      this.previousData.observableQueryOptions = newObservableQueryOptions;
      this.currentObservable
        .query!.setOptions(newObservableQueryOptions)
        // The error will be passed to the child container, so we don't
        // need to log it here. We could conceivably log something if
        // an option was set. OTOH we don't log errors w/ the original
        // query. See https://github.com/apollostack/react-apollo/issues/404
        .catch(() => {});
    }
  }

  private startQuerySubscription() {
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
        this.resubscribeToQuery();
        if (!error.hasOwnProperty('graphQLErrors')) throw error;
        this.updateCurrentData();
      }
    });
  }

  private resubscribeToQuery() {
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
    this.startQuerySubscription();
    Object.assign(this.currentObservable.query!, {
      lastError,
      lastResult
    });
  }

  private getQueryResult(): QueryResult<TData, TVariables> {
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
    if (this.getOptions().skip) {
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
      // decided upon, we map errors (graphQLErrors) to the error options.
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
        const { partialRefetch } = this.getOptions();
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

    // When the component is done rendering stored query errors, we'll
    // remove those errors from the `ObservableQuery` query store, so they
    // aren't re-displayed on subsequent (potentially error free)
    // requests/responses.
    setTimeout(() => {
      this.currentObservable.query!.resetQueryStoreErrors();
    });

    result.client = this.client;
    this.previousData.loading =
      (this.previousData.result && this.previousData.result.loading) || false;
    this.previousData.result = result;
    return result;
  }

  private handleErrorOrCompleted() {
    const {
      data,
      loading,
      error
    } = this.currentObservable.query!.getCurrentResult();

    if (!loading) {
      const { query, variables, onCompleted, onError } = this.getOptions();

      // No changes, so we won't call onError/onCompleted.
      if (
        this.previousOptions &&
        !this.previousData.loading &&
        isEqual(this.previousOptions.query, query) &&
        isEqual(this.previousOptions.variables, variables)
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
