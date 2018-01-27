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
import { parser, DocumentType } from './parser';

export interface MutationResult<TData = any> {
  data: TData;
  error?: ApolloError;
  loading: boolean;
}

export interface MutationProps<TData = any, TVariables = OperationVariables> {
  mutation: DocumentNode;
  variables?: TVariables;
  optimisticResponse?: Object;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn;
  children: (
    mutateFn: () => void,
    result?: MutationResult<TData>,
  ) => React.ReactNode;
  onCompleted?: (data: TData) => void;
  onError?: (error: ApolloError) => void;
}

export interface MutationState<TData = any> {
  notCalled: boolean;
  error?: ApolloError;
  data?: TData;
  loading?: boolean;
}

class Mutation<
  TData = any,
  TVariables = OperationVariables
> extends React.Component<
  MutationProps<TData, TVariables>,
  MutationState<TData>
> {
  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  private client: ApolloClient<any>;

  constructor(props: MutationProps<TData, TVariables>, context: any) {
    super(props, context);

    invariant(
      !!context.client,
      `Could not find "client" in the context of Mutation. Wrap the root component in an <ApolloProvider>`,
    );

    this.client = context.client;

    const operation = parser(props.mutation);

    invariant(
      operation.type === DocumentType.Mutation,
      `The <Mutation /> component requires a graphql mutation, but got a ${
        operation.type === DocumentType.Query ? 'query' : 'subscription'
      }.`,
    );

    this.state = {
      notCalled: true,
    };
  }

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

  private runMutation = async () => {
    const {
      mutation,
      variables,
      optimisticResponse,
      refetchQueries,
      update,
      onCompleted,
      onError,
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

      const data = response.data as TData;

      this.setState(
        {
          loading: false,
          data,
        },
        () => {
          if (onCompleted) {
            onCompleted(data);
          }
        },
      );
    } catch (e) {
      let error = e as ApolloError;

      this.setState(
        {
          loading: false,
          error,
        },
        () => {
          if (onError) {
            onError(error);
          }
        },
      );
    }
  };
}

export default Mutation;
