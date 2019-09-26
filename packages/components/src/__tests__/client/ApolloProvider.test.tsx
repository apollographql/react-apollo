import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import { Query } from '@apollo/react-components';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery
} from '@apollo/react-common';

describe('ApolloProvider', () => {
  afterEach(cleanup);

  it(
    'should be able to use one `ApolloProvider` instance across different ' +
      '`@apollo/react-X` packages and have them all share the same context',
    () => {
      const query = gql`
        query {
          foo @client {
            bar
          }
        }
      `;

      const typeDefs = 'abc123';
      const client = new ApolloClient({
        cache: new InMemoryCache(),
        resolvers: {},
        typeDefs
      });

      const Component = () => (
        <Query query={query}>
          {({ client: someClient }: any) => {
            expect(someClient.typeDefs).toEqual(typeDefs);
            return null;
          }}
        </Query>
      );

      const HookedComponent = () => {
        const { client: someClient } = useQuery(query);
        expect(someClient.typeDefs).toEqual(typeDefs);
        return null;
      };

      render(
        <ApolloProvider client={client}>
          <Component />
          <HookedComponent />
        </ApolloProvider>
      );
    }
  );
});
