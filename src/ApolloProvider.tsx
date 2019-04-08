import * as React from 'react';
import ApolloClient from 'apollo-client';
import { invariant } from 'ts-invariant';

import { getApolloContext } from './ApolloContext';

export interface ApolloProviderProps<TCache> {
  client: ApolloClient<TCache>;
  children: React.ReactNode;
};

const ApolloProvider: React.FC<ApolloProviderProps<any>> =
  ({ client, children }) => {
    const ApolloContext = getApolloContext();
    return (
      <ApolloContext.Consumer>
        {(context = {}) => {
          if (client) {
            context.client = client;
          }

          invariant(
            context.client,
            'ApolloProvider was not passed a client instance. Make ' +
              'sure you pass in your client via the "client" prop.',
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

export default ApolloProvider;
