import React from 'react';
import { render } from 'react-dom';
import ApolloClient from 'apollo-boost';
import { ApolloProvider } from 'react-apollo';

import AddUser from './AddUser';

const client = new ApolloClient({
  uri: 'https://n1k5mkl017.lp.gql.zone/graphql',
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <AddUser />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
