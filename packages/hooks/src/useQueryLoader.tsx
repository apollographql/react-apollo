import React from 'react';
import { invariant } from 'ts-invariant';
import {
  getApolloContext,
  OperationVariables,
  QueryResult
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { useQuery } from './useQuery';
import { QueryHookOptions } from './types';

export interface QueryLoaderResult<TData, TVariables>
  extends Pick<
    QueryResult<TData, TVariables>,
    | 'startPolling'
    | 'stopPolling'
    | 'subscribeToMore'
    | 'updateQuery'
    | 'refetch'
    | 'variables'
    | 'fetchMore'
    | 'client'
    | 'networkStatus'
  > {
  data: TData;
}

function useApolloContextOptions() {
  const { client, options = {} } = React.useContext(getApolloContext());
  invariant(
    client,
    'No Apollo Client instance can be found. Please ensure that you ' +
      'have called `ApolloProvider` higher up in your tree.'
  );
  invariant(
    options.defaultLoadingComponent && options.defaultErrorComponent,
    'The `defaultLoadingComponent` and `defaultErrorComponent` options must be set in order to use the `useQueryLoader` hook'
  );
  return options;
}

type RenderCallback<TData, TVariables> = (
  result: QueryLoaderResult<TData, TVariables>
) => React.ReactElement<any> | null;

export function useQueryLoader<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions
): (cb: RenderCallback<TData, TVariables>) => React.ReactElement<any> | null {
  const result = useQuery(query, options);
  return (renderCallback: RenderCallback<TData, TVariables>) =>
    render({ result, renderCallback });
}

interface QueryLoaderProps {
  result: QueryResult<any, any>;
  renderCallback: RenderCallback<any, any>;
}

function render({ result, renderCallback }: QueryLoaderProps) {
  const {
    defaultLoadingComponent,
    defaultErrorComponent
  } = useApolloContextOptions();
  if (!(defaultLoadingComponent && defaultErrorComponent)) {
    throw Error(
      'defaultLoadingComponent and defaultErrorComponent must be set prior to using the useQueryLoader() hook'
    );
  }
  if (result.loading) {
    return React.createElement(defaultLoadingComponent);
  }
  if (result.error) {
    return React.createElement(defaultErrorComponent, {
      errorObject: result.error
    });
  }
  return renderCallback(result);
}
