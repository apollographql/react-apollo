import * as React from 'react';
import ApolloClient from 'apollo-client';
import { DocumentNode } from 'graphql';

export interface ApolloContextValue {
  client?: ApolloClient<Object>;
  operations?: Map<string, { query: DocumentNode; variables: any }>;
}

type ContextType = ApolloContextValue | undefined;

export const ApolloContext = React.createContext<ContextType | undefined>(undefined)
