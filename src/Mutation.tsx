import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  PureQueryOptions,
  MutationUpdaterFn,
} from 'apollo-client';
const invariant = require('invariant');
import { DocumentNode } from 'graphql';

import { OperationVariables } from './types';

// notifyOnNetworkStatusChange?: boolean;

export interface MutationProps {
  mutation: DocumentNode;
  variables?: OperationVariables;
  optimisticResponse?: Object;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn;
  children: (mutateFn: () => void, result?: any) => React.ReactNode;
}

export interface MutationState {
  notCalled: boolean;
  error?: string;
  data?: any;
  loading?: boolean;
}

class Mutation extends React.Component<MutationProps, MutationState> {
  private client: ApolloClient<any>;

  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  constructor(props: any, context: any) {
    super(props, context);

    invariant(
      !!context.client,
      `Could not find "client" in the context of Mutation. Wrap the root component in an <ApolloProvider>`,
    );
    this.client = context.client;

    this.state = {
      notCalled: true,
    };
  }

  private runMutation = async () => {
    const {
      mutation,
      variables,
      optimisticResponse,
      refetchQueries,
      update,
    } = this.props;

    this.setState({
      loading: true,
      error: undefined,
      data: undefined,
      notCalled: false,
    });

    try {
      const response = await this.client.mutate({
        mutation,
        variables,
        optimisticResponse,
        refetchQueries,
        update,
      });

      this.setState({
        loading: false,
        data: response.data,
      });
    } catch (e) {
      this.setState({
        loading: false,
        error: e,
      });
    }
  };

  render() {
    const { children } = this.props;
    const { loading, data, error, notCalled } = this.state;

    const result = notCalled
      ? undefined
      : {
          loading,
          data,
          error,
        };

    return children(this.runMutation, result);
  }
}

export default Mutation;
