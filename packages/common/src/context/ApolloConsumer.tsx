import React from 'react';
import ApolloClient from 'apollo-client';
import { InvariantError } from 'ts-invariant';

import { getApolloContext } from './ApolloContext';

export interface ApolloConsumerProps {
  children: (client: ApolloClient<object>) => React.ReactChild | null;
}

export const ApolloConsumer: React.FC<ApolloConsumerProps> = props => {
  const ApolloContext = getApolloContext();
  return (
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
};
