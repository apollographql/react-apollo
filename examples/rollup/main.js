import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { Query, ApolloProvider } from 'react-apollo';
import gql from 'graphql-tag';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: 'http://localhost:4000/graphql',
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

ReactDOM.render(
  <ApolloProvider client={client}>
    <Query query={IS_LOGGED_IN}>
      {({data}) => [
        "logged " + (data.isLoggedIn ? "in" : "out"),
        <br/>,
        <button onClick={toggle}>
          log {data.isLoggedIn ? "out" : "in"}
        </button>,
      ]}
    </Query>
  </ApolloProvider>,
  document.getElementById('root'),
);
