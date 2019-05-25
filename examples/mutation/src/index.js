import React from 'react';
import { render } from 'react-dom';
import ApolloClient from 'apollo-boost';
import { ApolloProvider } from '@apollo/react-components';

import AddUser from './AddUser';

const client = new ApolloClient({
  uri: 'https://j1wv1z179v.sse.codesandbox.io'
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <AddUser />
  </ApolloProvider>
);

render(WrappedApp, document.getElementById('root'));
