import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  PureQueryOptions,
  MutationUpdaterFn,
  ApolloError,
} from 'apollo-client';
const invariant = require('invariant');
import { DocumentNode } from 'graphql';
const shallowEqual = require('fbjs/lib/shallowEqual');

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

const initialState = {
  notCalled: true,
};

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
  
  static propTypes = {
    mutation: PropTypes.object.isRequired,
    variables: PropTypes.object,
    optimisticResponse: PropTypes.object,
    refetchQueries: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.arrayOf(PropTypes.object)
    ]),
    update: PropTypes.func,
    children: PropTypes.func.isRequired,
    onCompleted: PropTypes.func,
    onError: PropTypes.func
  };

  private client: ApolloClient<any>;

  constructor(props: MutationProps<TData, TVariables>, context: any) {
    super(props, context);

    this.verifyContext(context);
    this.client = context.client;

    this.verifyDocumentIsMutation(props.mutation);

    this.state = initialState;
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (
      shallowEqual(this.props, nextProps) &&
      this.client === nextContext.client
    ) {
      return;
    }

    this.verifyDocumentIsMutation(nextProps.mutation);

    if (this.client !== nextContext.client) {
      this.client = nextContext.client;
      this.setState(initialState);
    }
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
    this.onStartMutation();

    try {
      const response = await this.mutate();
      this.onCompletedMutation(response);
    } catch (e) {
      this.onMutationError(e);
    }
  };

  private mutate = async () => {
    const {
      mutation,
      variables,
      optimisticResponse,
      refetchQueries,
      update,
    } = this.props;

    const response = await this.client.mutate({
      mutation,
      variables,
      optimisticResponse,
      refetchQueries,
      update,
    });

    return response;
  };

  private onStartMutation = () => {
    this.setState({
      loading: true,
      error: undefined,
      data: undefined,
      notCalled: false,
    });
  };

  private onCompletedMutation = response => {
    const { onCompleted } = this.props;

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
  };

  private onMutationError = async error => {
    const { onError } = this.props;

    let apolloError = error as ApolloError;

    this.setState(
      {
        loading: false,
        error: apolloError,
      },
      () => {
        if (onError) {
          onError(apolloError);
        }
      },
    );
  };

  private verifyDocumentIsMutation = mutation => {
    const operation = parser(mutation);
    invariant(
      operation.type === DocumentType.Mutation,
      `The <Mutation /> component requires a graphql mutation, but got a ${
        operation.type === DocumentType.Query ? 'query' : 'subscription'
      }.`,
    );
  };

  private verifyContext = context => {
    invariant(
      !!context.client,
      `Could not find "client" in the context of Mutation. Wrap the root component in an <ApolloProvider>`,
    );
  };
}

export default Mutation;
