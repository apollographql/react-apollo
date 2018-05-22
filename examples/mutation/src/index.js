import React from 'react';
import { render } from 'react-dom';
import ApolloClient from 'apollo-boost';
import { ApolloProvider } from 'react-apollo';

import AddUser from './addUser';

const client = new ApolloClient({
  uri: 'https://kqpk9j3kz7.lp.gql.zone/graphql',
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <AddUser />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
