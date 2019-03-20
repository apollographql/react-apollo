import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient from 'apollo-client';
import { ApolloContext } from './ApolloContext';
import { InvariantError } from 'ts-invariant';

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}

const ApolloConsumer: React.StatelessComponent<ApolloConsumerProps> =
  (props, legacyContext) => {
    function finish(context: any) {
      if (!context || !context.client) {
        throw new InvariantError(
          'Could not find "client" in the context of ApolloConsumer. ' +
          'Wrap the root component in an <ApolloProvider>.'
        );
      }
      return props.children(context.client);
    }

    return ApolloContext ? (
      <ApolloContext.Consumer>
        {finish}
      </ApolloContext.Consumer>
    ) : (
      // Fall back to legacy context API if React.createContext not available.
      finish(legacyContext)
    );
  };

ApolloConsumer.contextTypes = {
  client: PropTypes.object.isRequired,
};

ApolloConsumer.propTypes = {
  children: PropTypes.func.isRequired,
};

export default ApolloConsumer;
