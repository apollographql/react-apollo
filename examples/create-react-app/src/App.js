import React, { Component } from 'react';
import { ApolloClient, ApolloProvider, createNetworkInterface } from 'react-apollo';

import Pokemon from "./Pokemon";

export const networkInterface = createNetworkInterface({ uri: 'https://graphql-pokemon.now.sh/' });
export const client = new ApolloClient({ networkInterface });

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <Pokemon />
      </ApolloProvider>
    );
  }
}

export default App;
