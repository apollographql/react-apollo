import { useContext, useEffect, useReducer, useRef } from 'react';
import {
  getApolloContext,
  OperationVariables,
  QueryResult
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { QueryHookOptions, QueryOptions } from './types';
import { QueryData } from './data/QueryData';

export function useQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
): QueryResult<TData, TVariables> {
  const context = useContext(getApolloContext());
  const [_ignored, forceUpdate] = useReducer(x => x + 1, 0);
  const updatedOptions = options ? { ...options, query } : { query };

  const queryDataRef = useRef<QueryData<TData, TVariables>>();
  function getQueryDataRef() {
    if (!queryDataRef.current) {
      queryDataRef.current = new QueryData<TData, TVariables>({
        options: updatedOptions as QueryOptions<TData, TVariables>,
        context,
        forceUpdate
      });
    }
    return queryDataRef.current;
  }

  const queryData = getQueryDataRef();
  queryData.setOptions(updatedOptions);
  queryData.context = context;

  useEffect(() => queryData.afterExecute());

  return queryData.execute();
}
