// @flow
import React, { Component } from 'react';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { ApolloProvider } from "../../../lib/src";

import Articles from "./Articles";

class App extends Component {
  constructor(...args) {
    super(...args);

    const networkInterface = createNetworkInterface('/graphql');
    this.client = new ApolloClient({ networkInterface });
  }

  render() {
    return (
      <ApolloProvider client={this.client}>
        <Articles />
      </ApolloProvider>
    );
  }
}

export default App;
