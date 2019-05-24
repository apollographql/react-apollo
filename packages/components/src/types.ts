import {
  OperationVariables,
  QueryFunctionOptions,
  QueryResult,
  BaseMutationOptions,
  MutationFunction,
  MutationResult
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

export interface QueryComponentOptions<
  TData = any,
  TVariables = OperationVariables
> extends QueryFunctionOptions<TData, TVariables> {
  children: (result: QueryResult<TData, TVariables>) => JSX.Element | null;
  query: DocumentNode;
}

export interface MutationComponentOptions<
  TData = any,
  TVariables = OperationVariables
> extends BaseMutationOptions<TData, TVariables> {
  mutation: DocumentNode;
  children: (
    mutateFunction: MutationFunction<TData, TVariables>,
    result: MutationResult<TData>
  ) => JSX.Element | null;
}
