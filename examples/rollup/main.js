import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { useQuery, ApolloProvider } from '@apollo/react-hooks';
import gql from 'graphql-tag';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: 'http://localhost:4000/graphql'
  })
});

client.writeData({
  data: {
    isLoggedIn: false
  }
});

const IS_LOGGED_IN = gql`
  query IsUserLoggedIn {
    isLoggedIn @client
  }
`;

function toggle() {
  const result = client.readQuery({ query: IS_LOGGED_IN });
  client.writeData({
    data: {
      isLoggedIn: !result.isLoggedIn
    }
  });
}

const Query = () => {
  const { data } = useQuery(IS_LOGGED_IN);
  return [
    'logged ' + (data.isLoggedIn ? 'in' : 'out'),
    <br />,
    <button onClick={toggle}>log {data.isLoggedIn ? 'out' : 'in'}</button>
  ];
};

ReactDOM.render(
  <ApolloProvider client={client}>
    <Query />
  </ApolloProvider>,
  document.getElementById('root')
);
