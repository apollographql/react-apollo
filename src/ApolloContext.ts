import React from 'react';
import ApolloClient from 'apollo-client';

import { RenderPromises } from './getDataFromTree';

export interface ApolloContextValue {
  client?: ApolloClient<Object>;
  renderPromises?: RenderPromises;
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
