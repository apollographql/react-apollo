
import React, { Component } from 'react';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from 'react-apollo';
import { AppRegistry } from 'react-native';

import Pokemon from './Pokemon';

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

AppRegistry.registerComponent('reactnative', () => App);
