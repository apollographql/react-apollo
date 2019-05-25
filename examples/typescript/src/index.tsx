import React from 'react';
import { render } from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from '@apollo/react-components';

import { App } from './App';

const httpLink = createHttpLink({
  uri: 'https://ojo6385vn6.sse.codesandbox.io'
});

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: httpLink
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
