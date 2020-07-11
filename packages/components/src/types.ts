import {
  OperationVariables,
  QueryResult,
  QueryFunctionOptions,
  BaseMutationOptions,
  MutationFunction,
  MutationResult,
  SubscriptionResult,
  BaseSubscriptionOptions
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

export interface QueryComponentOptions<
  TData = any,
  TVariables = OperationVariables
> extends QueryFunctionOptions<TData, TVariables> {
  children: (result: QueryResult<TData, TVariables>) => React.ReactNode
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

export interface SubscriptionComponentOptions<
  TData = any,
  TVariables = OperationVariables
  > extends BaseSubscriptionOptions<TData, TVariables> {
  subscription: DocumentNode;
  children?: null | ((result: SubscriptionResult<TData>) => JSX.Element | null);
}
