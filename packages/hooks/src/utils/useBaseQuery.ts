import { useContext, useEffect, useReducer, useRef } from 'react';
import {
  getApolloContext,
  OperationVariables,
  QueryResult,
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { QueryHookOptions, QueryOptions, QueryTuple } from '../types';
import { QueryData } from '../data/QueryData';
import { useDeepMemo } from './useDeepMemo';

export function useBaseQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>,
  lazy = false
) {
  const context = useContext(getApolloContext());
  const isMounted = useRef(false);
  const [tick, forceUpdate] = useReducer((x) => x + 1, 0);
  const updatedOptions = options ? { ...options, query } : { query };

  const queryDataRef = useRef<QueryData<TData, TVariables>>();
  const queryData =
    queryDataRef.current ||
    new QueryData<TData, TVariables>({
      options: updatedOptions as QueryOptions<TData, TVariables>,
      context,
      onNewData() {
        if (!queryData.ssrInitiated()) {
          // When new data is received from the `QueryData` object, we want to
          // force a re-render to make sure the new data is displayed. We can't
          // force that re-render if we're already rendering however so to be
          // safe we'll trigger the re-render in a microtask.
          Promise.resolve().then(() => {
            if (!isMounted.current) {
              return;
            }

            return forceUpdate();
          });
        } else {
          // If we're rendering on the server side we can force an update at
          // any point.
          forceUpdate();
        }
      },
    });

  queryData.setOptions(updatedOptions);
  queryData.context = context;

  // SSR won't trigger the effect hook below that stores the current
  // `QueryData` instance for future renders, so we'll handle that here if
  // the current render is happening server side.
  if (queryData.ssrInitiated() && !queryDataRef.current) {
    queryDataRef.current = queryData;
  }

  // `onError` and `onCompleted` callback functions will not always have a
  // stable identity, so we'll exclude them from the memoization key to
  // prevent `afterExecute` from being triggered un-necessarily.
  const memo = {
    options: { ...updatedOptions, onError: undefined, onCompleted: undefined },
    context,
    tick,
  };

  const result = useDeepMemo(
    () => (lazy ? queryData.executeLazy() : queryData.execute()),
    memo
  );

  const queryResult = lazy
    ? (result as QueryTuple<TData, TVariables>)[1]
    : (result as QueryResult<TData, TVariables>);

  useEffect(() => {
    // We only need one instance of the `QueryData` class, so we'll store it
    // as a ref to make it available on subsequent renders.
    if (!queryDataRef.current) {
      queryDataRef.current = queryData;
    }

    isMounted.current = true;

    return () => {
      isMounted.current = false;
      return queryData.cleanup();
    };
  }, []);

  useEffect(() => queryData.afterExecute({ lazy }), [
    queryResult.loading,
    queryResult.networkStatus,
    queryResult.error,
    queryResult.data,
  ]);

  return result;
}
