import { ReactNode } from 'react';
import {
  ApolloClient,
  ApolloQueryResult,
  ObservableQuery
} from 'apollo-client';
import { Observable } from 'apollo-link';
import {
  OperationVariables,
  QueryFunctionOptions,
  QueryResult,
  BaseMutationOptions,
  MutationResult,
  MutationFunctionOptions,
  ExecutionResult,
  BaseSubscriptionOptions,
  SubscriptionResult
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

/* Common types */

export type CommonOptions<TOptions> = TOptions & {
  client?: ApolloClient<object>;
};

/* Query types */

export interface QueryOptions<TData = any, TVariables = OperationVariables>
  extends QueryFunctionOptions<TData, TVariables> {
  children?: (result: QueryResult<TData, TVariables>) => ReactNode;
  query: DocumentNode;
}

export interface QueryHookOptions<TData = any, TVariables = OperationVariables>
  extends QueryFunctionOptions<TData, TVariables> {
  query?: DocumentNode;
}

export interface QueryPreviousData<TData, TVariables> {
  client?: ApolloClient<object>;
  query?: DocumentNode;
  observableQueryOptions?: {};
  result?: ApolloQueryResult<TData> | null;
  loading?: boolean;
  options?: QueryOptions<TData, TVariables>;
}

export interface QueryCurrentObservable<TData, TVariables> {
  query?: ObservableQuery<TData, TVariables> | null;
  subscription?: ZenObservable.Subscription;
}

/* Mutation types */

export interface MutationHookOptions<
  TData = any,
  TVariables = OperationVariables
> extends BaseMutationOptions<TData, TVariables> {
  mutation?: DocumentNode;
}

export interface MutationOptions<TData = any, TVariables = OperationVariables>
  extends BaseMutationOptions<TData, TVariables> {
  mutation: DocumentNode;
}

export type MutationTuple<TData, TVariables> = [
  (
    options?: MutationFunctionOptions<TData, TVariables>
  ) => Promise<void | ExecutionResult<TData>>,
  MutationResult<TData>
];

/* Subscription types */

export interface SubscriptionHookOptions<
  TData = any,
  TVariables = OperationVariables
> extends BaseSubscriptionOptions<TData, TVariables> {
  subscription?: DocumentNode;
}

export interface SubscriptionOptions<
  TData = any,
  TVariables = OperationVariables
> extends BaseSubscriptionOptions<TData, TVariables> {
  subscription: DocumentNode;
  children?: null | ((result: SubscriptionResult<TData>) => JSX.Element | null);
}

export interface SubscriptionCurrentObservable {
  query?: Observable<any>;
  subscription?: ZenObservable.Subscription;
}
