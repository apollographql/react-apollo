import React from 'react';
import ApolloClient from 'apollo-client';

import { RenderPromises } from './getDataFromTree';

export interface ApolloContextValue {
  client?: ApolloClient<Object>;
  renderPromises?: RenderPromises;
}

export const ApolloContext = React.createContext<ApolloContextValue>({});
