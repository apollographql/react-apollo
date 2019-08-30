import { useContext, useEffect, useReducer, useRef } from 'react';
import { getApolloContext, OperationVariables } from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { QueryHookOptions, QueryOptions } from '../types';
import { QueryData } from '../data/QueryData';
import { useDeepMemo } from './useDeepMemo';

export function useBaseQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>,
  lazy = false
) {
  const context = useContext(getApolloContext());
  const [tick, forceUpdate] = useReducer(x => x + 1, 0);
  const updatedOptions = options ? { ...options, query } : { query };

  const queryDataRef = useRef<QueryData<TData, TVariables>>();

  if (!queryDataRef.current) {
    queryDataRef.current = new QueryData<TData, TVariables>({
      options: updatedOptions as QueryOptions<TData, TVariables>,
      context,
      forceUpdate
    });
  }

  const queryData = queryDataRef.current;
  queryData.setOptions(updatedOptions);
  queryData.context = context;

  // `onError` and `onCompleted` callback functions will not always have a
  // stable identity, so we'll exclude them from the memoization key to
  // prevent `afterExecute` from being triggered un-necessarily.
  const memo = {
    options: { ...updatedOptions, onError: undefined, onCompleted: undefined },
    context,
    tick
  };

  const result = useDeepMemo(
    () => (lazy ? queryData.executeLazy() : queryData.execute()),
    memo
  );

  useEffect(() => queryData.afterExecute({ lazy }), [result]);

  useEffect(() => {
    return () => queryData.cleanup();
  }, []);

  return result;
}
