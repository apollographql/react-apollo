import React from 'react';
import { render } from 'react-dom';
import ApolloClient from 'apollo-boost';
import { ApolloProvider } from 'react-apollo';

import { App } from './App';

const client = new ApolloClient({
  uri: 'https://mpjk0plp9.lp.gql.zone/graphql',
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <App episode="EMPIRE" />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
