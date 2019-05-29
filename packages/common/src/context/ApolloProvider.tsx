import React from 'react';
import ApolloClient from 'apollo-client';
import { invariant } from 'ts-invariant';

import { getApolloContext, ApolloContextOptions } from './ApolloContext';

export interface ApolloProviderProps<TCache> {
  client: ApolloClient<TCache>;
  children: React.ReactNode | React.ReactNode[] | null;
  options?: ApolloContextOptions;
}

export const ApolloProvider: React.FC<ApolloProviderProps<any>> = ({
  client,
  options,
  children
}) => {
  const ApolloContext = getApolloContext();
  return (
    <ApolloContext.Consumer>
      {(context = {}) => {
        if (client) {
          context.client = client;
        }
        if (options) {
          context.options = options;
        }

        invariant(
          context.client,
          'ApolloProvider was not passed a client instance. Make ' +
            'sure you pass in your client via the "client" prop.'
        );

        return (
          <ApolloContext.Provider value={context}>
            {children}
          </ApolloContext.Provider>
        );
      }}
    </ApolloContext.Consumer>
  );
};
