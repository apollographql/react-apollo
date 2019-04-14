import ApolloClient from 'apollo-client';
import { invariant } from 'ts-invariant';

import { ApolloContextValue } from '@apollo/react-common';

export interface CommonComponentProps {
  client?: ApolloClient<Object>;
}

export function getClient(
  props: CommonComponentProps,
  context: ApolloContextValue,
): ApolloClient<Object> {
  const client = props.client || context.client;

  invariant(
    !!client,
    'Could not find "client" in the context or passed in as a prop. ' +
      'Wrap the root component in an <ApolloProvider>, or pass an ' +
      'ApolloClient instance in via props.',
  );

  return client as ApolloClient<Object>;
}
