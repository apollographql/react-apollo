import * as React from 'react';
import ApolloClient from 'apollo-client';
import { InvariantError } from 'ts-invariant';

import { ApolloContext } from './ApolloContext';

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}

const ApolloConsumer: React.FC<ApolloConsumerProps> = props => (
  <ApolloContext.Consumer>
    {(context: any) => {
      if (!context || !context.client) {
        throw new InvariantError(
          'Could not find "client" in the context of ApolloConsumer. ' +
          'Wrap the root component in an <ApolloProvider>.'
        );
      }
      return props.children(context.client);
    }}
  </ApolloContext.Consumer>
);

export default ApolloConsumer;
