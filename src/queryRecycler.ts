import { ObservableQuery, Subscription } from 'apollo-client';

import { QueryOpts } from './types';

/**
 * An observable query recycler stores some observable queries that are no
 * longer in use, but that we may someday use again.
 *
 * Recycling observable queries avoids a few unexpected functionalities that
 * may be hit when using the `react-apollo` API. Namely not updating queries
 * when a component unmounts, and calling reducers/`updateQueries` more times
 * then is necessary for old observable queries.
 *
 * We assume that the GraphQL document for every `ObservableQuery` is the same.
 *
 * For more context on why this was added and links to the issues recycling
 * `ObservableQuery`s fixes see issue [#462][1].
 *
 * [1]: https://github.com/apollographql/react-apollo/pull/462
 */
export class ObservableQueryRecycler {
  /**
   * The internal store for our observable queries and temporary subscriptions.
   */
  private observableQueries: Array<{
    observableQuery: ObservableQuery<any>;
    subscription: Subscription;
  }> = [];

  /**
   * Recycles an observable query that the recycler is finished with. It is
   * stored in this class so that it may be used later on.
   *
   * A subscription is made to the observable query so that it continues to
   * live even though the updates are noops.
   *
   * By recycling an observable query we keep the results fresh so that when it
   * gets reused all of the mutations that have happened since recycle and
   * reuse have been applied.
   */
  public recycle(observableQuery: ObservableQuery<any>): void {
    // Stop the query from polling when we recycle. Polling may resume when we
    // reuse it and call `setOptions`.
    observableQuery.setOptions({
      fetchPolicy: 'standby',
      pollInterval: 0,
      fetchResults: false, // ensure we don't create another observer in AC
    });

    this.observableQueries.push({
      observableQuery,
      subscription: observableQuery.subscribe({}),
    });
  }

  /**
   * Reuses an observable query that was recycled earlier on in this class’s
   * lifecycle. This observable was kept fresh by our recycler with a
   * subscription that will be unsubscribed from before returning the
   * observable query.
   *
   * All mutations that occured between the time of recycling and the time of
   * reusing have been applied.
   */
  public reuse(options: QueryOpts): ObservableQuery<any> {
    if (this.observableQueries.length <= 0) {
      return null;
    }
    const { observableQuery, subscription } = this.observableQueries.pop();
    subscription.unsubscribe();

    // strip off react-apollo specific options
    const { ssr, skip, client, ...modifiableOpts } = options;

    // When we reuse an `ObservableQuery` then the document and component
    // GraphQL display name should be the same. Only the options may be
    // different.
    //
    // Therefore we need to set the new options.
    //
    // If this observable query used to poll then polling will be restarted.
    observableQuery.setOptions({
      ...modifiableOpts,
      // Explicitly set options changed when recycling to make sure they
      // are set to `undefined` if not provided in options.
      pollInterval: options.pollInterval,
      fetchPolicy: options.fetchPolicy,
    });

    return observableQuery;
  }
}
