import React from 'react';
import { render } from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';

import { App } from './App';

const client = new ApolloClient({
  link: new HttpLink({ uri: 'https://mpjk0plp9.lp.gql.zone/graphql' }),
  cache: new InMemoryCache(),
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
