import React, { Component } from 'react';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from 'react-apollo'; // XXX figure out local dev

import Pokemon from "./Pokemon";

export const networkInterface = createNetworkInterface({ uri: 'https://graphql-pokemon.now.sh/' });
export const client = new ApolloClient({
  networkInterface,
  initialState: typeof window !== "undefined" && window.__APOLLO_STATE__
});

class App extends Component {
  render() {
    return (
      <ApolloProvider client={this.props.client || client}>
        <Pokemon />
      </ApolloProvider>
    );
  }
}

export default App;
