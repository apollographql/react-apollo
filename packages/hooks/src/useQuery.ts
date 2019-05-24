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
  const queryDataRef = useRef(
    new QueryData<TData, TVariables>({
      options: updatedOptions as QueryOptions<TData, TVariables>,
      context,
      forceUpdate
    })
  );
  const queryData = queryDataRef.current;
  queryData.options = updatedOptions;
  queryData.context = context;

  useEffect(() => {
    return queryData.afterExecute();
  });

  return queryData.execute();
}
