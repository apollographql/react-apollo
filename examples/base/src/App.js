import React, { Component } from 'react';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from "../../../lib/src";

import Articles from "./Articles";

export const networkInterface = createNetworkInterface({ uri: '/graphql' });
export const client = new ApolloClient({ networkInterface });

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <Articles />
      </ApolloProvider>
    );
  }
}

export default App;
