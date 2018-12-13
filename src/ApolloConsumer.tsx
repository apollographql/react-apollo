import * as React from 'react';
import ApolloClient from 'apollo-client';
import ApolloContext from './context';

const invariant = require('invariant');

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any> | null) => React.ReactElement<any> | null;
}

const ApolloConsumer: React.StatelessComponent<ApolloConsumerProps> = ({ children }) => (
  <ApolloContext.Consumer>
    {({ client }: { client: ApolloClient<any> | null }) => {
      invariant(
        !!client,
        `Could not find "client" in the context of ApolloConsumer. Wrap the root component in an <ApolloProvider>`,
      );
      return children(client)
    }}
  </ApolloContext.Consumer>
);

export default ApolloConsumer;
