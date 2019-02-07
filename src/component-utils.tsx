import ApolloClient from 'apollo-client';
import { invariant } from 'ts-invariant';

export interface CommonComponentProps {
  client?: ApolloClient<Object>;
}

export interface CommonComponentContext {
  client?: ApolloClient<Object>;
}

export function getClient(
  props: CommonComponentProps,
  context: CommonComponentContext,
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
