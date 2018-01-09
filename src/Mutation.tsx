import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  PureQueryOptions,
  MutationUpdaterFn,
  ApolloError,
} from 'apollo-client';
const invariant = require('invariant');
import { DocumentNode } from 'graphql';

import { OperationVariables } from './types';

export interface MutationResult<TData = any> {
  data: TData;
  error?: ApolloError;
  loading: boolean;
}

export interface MutationProps<TData = any> {
  mutation: DocumentNode;
  variables?: OperationVariables;
  optimisticResponse?: Object;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn;
  children: (
    mutateFn: () => void,
    result?: MutationResult<TData>,
  ) => React.ReactNode;
  // notifyOnNetworkStatusChange?: boolean;
}

export interface MutationState<TData = any> {
  notCalled: boolean;
  error?: ApolloError;
  data?: TData;
  loading?: boolean;
}

class Mutation<TData = any> extends React.Component<
  MutationProps<TData>,
  MutationState<TData>
> {
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
        data: response.data as TData,
      });
    } catch (e) {
      this.setState({
        loading: false,
        error: e as ApolloError,
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
