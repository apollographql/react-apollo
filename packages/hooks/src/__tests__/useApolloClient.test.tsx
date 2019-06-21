import React from 'react';
import { ApolloProvider, resetApolloContext } from '@apollo/react-common';
import { render, cleanup } from '@testing-library/react';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { InvariantError } from 'ts-invariant';
import { useApolloClient } from '@apollo/react-hooks';

describe('useApolloClient Hook', () => {
  afterEach(() => {
    cleanup();
    resetApolloContext();
  });

  it('should return a client instance from the context if available', () => {
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.empty()
    });

    function App() {
      expect(useApolloClient()).toEqual(client);
      return null;
    }

    render(
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    );
  });

  it("should error if a client instance can't be found in the context", () => {
    function App() {
      expect(() => useApolloClient()).toThrow(InvariantError);
      return null;
    }

    render(<App />);
  });
});
