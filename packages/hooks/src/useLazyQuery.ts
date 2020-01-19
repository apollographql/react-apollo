import { OperationVariables } from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { LazyQueryHookOptions, QueryTuple } from './types';
import { useBaseQuery } from './utils/useBaseQuery';

export type UseLazyQuery<TData = any, TVariables = OperationVariables> = (
  query: DocumentNode,
  options?: LazyQueryHookOptions<TData, TVariables>
) => QueryTuple<TData, TVariables>;

export function useLazyQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: LazyQueryHookOptions<TData, TVariables>
) {
  return useBaseQuery<TData, TVariables>(query, options, true) as QueryTuple<
    TData,
    TVariables
  >;
}
