import React from 'react';
import ApolloClient from 'apollo-client';

export interface ApolloContextType {
  client: ApolloClient<any> | null;
  operations?: any;
}

const ApolloContext = React.createContext<ApolloContextType>({ client: null});

export default ApolloContext;
