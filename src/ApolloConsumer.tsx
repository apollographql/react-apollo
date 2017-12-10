import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient from 'apollo-client';
import * as invariant from 'invariant';

type Props = {
  render: (client: ApolloClient<any>) => React.ReactElement<any>;
};

type Context = {
  client: ApolloClient<any>;
};

const ApolloConsumer: React.StatelessComponent<Props> = (props, context) => {
  invariant(
    !!context.client,
    `Could not find "client" in the context of ApolloConsumer. Wrap the root component in an <ApolloProvider>`,
  );

  return props.render(context.client);
};

ApolloConsumer.contextTypes = {
  client: PropTypes.object.isRequired,
};

export default ApolloConsumer;
