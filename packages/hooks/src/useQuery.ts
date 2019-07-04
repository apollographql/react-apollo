import { useContext, useEffect, useReducer, useRef } from 'react';
import {
  getApolloContext,
  OperationVariables,
  QueryResult
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { QueryHookOptions, QueryOptions, QueryTuple } from './types';
import { QueryData } from './data/QueryData';
import { useDeepMemo } from './utils/useDeepMemo';

export function useQuery<
  TData = any,
  TVariables = OperationVariables,
  TLazy = undefined
>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables, TLazy>
): TLazy extends boolean
  ? QueryTuple<TData, TVariables>
  : QueryResult<TData, TVariables> {
  const context = useContext(getApolloContext());
  const [tick, forceUpdate] = useReducer(x => x + 1, 0);
  const updatedOptions = options ? { ...options, query } : { query };

  const queryDataRef = useRef<QueryData<TData, TVariables, TLazy>>();
  function getQueryDataRef() {
    if (!queryDataRef.current) {
      queryDataRef.current = new QueryData<TData, TVariables, TLazy>({
        options: updatedOptions as QueryOptions<TData, TVariables, TLazy>,
        context,
        forceUpdate
      });
    }
    return queryDataRef.current;
  }

  const queryData = getQueryDataRef();
  queryData.setOptions(updatedOptions);
  queryData.context = context;

  const memo = {
    options: updatedOptions,
    context,
    tick
  };
  const result = useDeepMemo(() => queryData.execute(), memo);

  useEffect(() => queryData.afterExecute(), [result]);

  return result;
}
