import * as React from 'react';
import * as PropTypes from "prop-types";
import ApolloClient from 'apollo-client';
const invariant = require('invariant');

import ApolloContext from './ApolloContext';

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}

const ApolloConsumer: React.StatelessComponent<ApolloConsumerProps> = props => {
  return (
    <ApolloContext.Consumer>
      {client => {
        invariant(
          !!client,
          `Could not find "client" in the context of ApolloConsumer. Wrap the root component in an <ApolloProvider>`,
        );
        return props.children(client);
      }}
    </ApolloContext.Consumer>
  );
};

ApolloConsumer.propTypes = {
  children: PropTypes.func.isRequired,
};

export default ApolloConsumer;
