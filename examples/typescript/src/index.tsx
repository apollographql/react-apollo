// @flow
import * as React from 'react';
import { render } from 'react-dom';
import {
  ApolloProvider,
  ApolloClient,
  createNetworkInterface,
} from 'react-apollo';

import { App } from './App';

const client = new ApolloClient({
  networkInterface: createNetworkInterface({
    uri: 'https://mpjk0plp9.lp.gql.zone/graphql',
  }),
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
