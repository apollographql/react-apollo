import React from 'react';
import ApolloClient from 'apollo-client';

export interface ApolloContextValue {
  client?: ApolloClient<object>;
  renderPromises?: Record<any, any>;
  options?: ApolloContextOptions;
}

export interface ApolloContextOptions {
  defaultLoadingComponent?: React.ComponentType<any>;
  defaultErrorComponent?: React.ComponentType<{ errorObject: Error }>;
}

let apolloContext: React.Context<ApolloContextValue>;

export function getApolloContext() {
  if (!apolloContext) {
    apolloContext = React.createContext<ApolloContextValue>({});
  }
  return apolloContext;
}

export function resetApolloContext() {
  apolloContext = React.createContext<ApolloContextValue>({});
}
