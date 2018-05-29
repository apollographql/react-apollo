import ApolloClient from 'apollo-client';
const invariant = require('invariant');

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
    'Could not find "client" in the context of Query or as passed props.',
    'Wrap the root component in an <ApolloProvider>',
  );

  // fixme: TS doesn't infer that the type cannot be undefined after the invariant.
  return client as ApolloClient<Object>;
}
