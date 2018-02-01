import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient from 'apollo-client';
import invariant from 'invariant';

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}

const ApolloConsumer: React.StatelessComponent<ApolloConsumerProps> = (
  props,
  context,
) => {
  invariant(
    !!context.client,
    `Could not find "client" in the context of ApolloConsumer. Wrap the root component in an <ApolloProvider>`,
  );

  return props.children(context.client);
};

ApolloConsumer.contextTypes = {
  client: PropTypes.object.isRequired,
};

export default ApolloConsumer;
