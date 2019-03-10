import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient from 'apollo-client';
import ApolloContext from './ApolloContext';

import { invariant } from 'ts-invariant';

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}

const ApolloConsumer: React.StatelessComponent<ApolloConsumerProps> = (props) => {
  return (
    <ApolloContext.Consumer>
      {(context) => {
        if (!context || !context.client) {
          throw new Error(
            `Invariant violation. Could not find "client" in the context of ApolloConsumer. Wrap the root component in an <ApolloProvider>`
          );
        }

        return props.children(context.client);
      }}
    </ApolloContext.Consumer>
  );
};

ApolloConsumer.contextTypes = {
  client: PropTypes.object.isRequired,
};

ApolloConsumer.propTypes = {
  children: PropTypes.func.isRequired,
};

export default ApolloConsumer;
