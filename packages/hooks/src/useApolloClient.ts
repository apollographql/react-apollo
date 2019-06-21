import React from 'react';
import { invariant } from 'ts-invariant';
import { getApolloContext } from '@apollo/react-common';
import ApolloClient from 'apollo-client';

export function useApolloClient(): ApolloClient<object> {
  const { client } = React.useContext(getApolloContext());
  invariant(
    client,
    'No Apollo Client instance can be found. Please ensure that you ' +
      'have called `ApolloProvider` higher up in your tree.'
  );
  return client!;
}
