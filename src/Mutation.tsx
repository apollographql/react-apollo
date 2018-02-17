import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { PureQueryOptions, ApolloError } from 'apollo-client';
import { DataProxy } from 'apollo-cache';
const invariant = require('invariant');
import { DocumentNode, GraphQLError } from 'graphql';
const shallowEqual = require('fbjs/lib/shallowEqual');

import { OperationVariables } from './types';
import { parser, DocumentType } from './parser';

export interface MutationResult<TData = Record<string, any>> {
  data?: TData;
  error?: ApolloError;
  loading?: boolean;
}
export interface MutationContext {
  client: ApolloClient<Object>;
}

export interface ExecutionResult<T = Record<string, any>> {
  data?: T;
  extensions?: Record<string, any>;
  errors?: GraphQLError[];
}

// Improved MutationUpdaterFn type, need to port them back to Apollo Client
export declare type MutationUpdaterFn<
  T = {
    [key: string]: any;
  }
> = (proxy: DataProxy, mutationResult: FetchResult<T>) => void;

export declare type FetchResult<
  C = Record<string, any>,
  E = Record<string, any>
> = ExecutionResult<C> & {
  extensions?: E;
  context?: C;
};

export declare type MutationOptions<TVariables = OperationVariables> = {
  variables?: TVariables;
};

export interface MutationProps<TData = any, TVariables = OperationVariables> {
  mutation: DocumentNode;
  optimisticResponse?: Object;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn<TData>;
  children: (
    mutateFn: (
      options?: MutationOptions<TVariables>
    ) => Promise<void | FetchResult>,
    result?: MutationResult<TData>
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
      PropTypes.arrayOf(PropTypes.object),
    ]),
    update: PropTypes.func,
    children: PropTypes.func.isRequired,
    onCompleted: PropTypes.func,
    onError: PropTypes.func,
  };

  private client: ApolloClient<any>;
  private mostRecentMutationId: number;

  constructor(props: MutationProps<TData, TVariables>, context: any) {
    super(props, context);

    this.verifyContext(context);
    this.client = context.client;

    this.verifyDocumentIsMutation(props.mutation);

    this.mostRecentMutationId = 0;
    this.state = initialState;
  }

  componentWillReceiveProps(
    nextProps: MutationProps<TData, TVariables>,
    nextContext: MutationContext
  ) {
    if (
      shallowEqual(this.props, nextProps) &&
      this.client === nextContext.client
    ) {
      return;
    }

    if (this.props.mutation !== nextProps.mutation) {
      this.verifyDocumentIsMutation(nextProps.mutation);
    }

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

  private runMutation = (options: MutationOptions<TVariables> = {}) => {
    this.onStartMutation();

    const mutationId = this.generateNewMutationId();

    return this.mutate(options)
      .then(response => {
        this.onCompletedMutation(response, mutationId);
        return response;
      })
      .catch(e => {
        this.onMutationError(e, mutationId);
      });
  };

  private mutate = (options: MutationOptions<TVariables>) => {
    const { mutation, optimisticResponse, refetchQueries, update } = this.props;

    const { variables } = options;

    return this.client.mutate({
      mutation,
      variables,
      optimisticResponse,
      refetchQueries,
      update,
    });
  };

  private onStartMutation = () => {
    if (!this.state.loading) {
      this.setState({
        loading: true,
        error: undefined,
        data: undefined,
        notCalled: false,
      });
    }
  };

  private onCompletedMutation = (
    response: ExecutionResult<TData>,
    mutationId: number
  ) => {
    const { onCompleted } = this.props;

    const data = response.data as TData;

    const callOncomplete = () => {
      if (onCompleted) {
        onCompleted(data);
      }
    };

    if (this.isMostRecentMutation(mutationId)) {
      this.setState(
        {
          loading: false,
          data,
        },
        () => {
          callOncomplete();
        }
      );
    } else {
      callOncomplete();
    }
  };

  private onMutationError = (error: ApolloError, mutationId: number) => {
    const { onError } = this.props;

    let apolloError = error as ApolloError;

    const callOnError = () => {
      if (onError) {
        onError(apolloError);
      }
    };

    if (this.isMostRecentMutation(mutationId)) {
      this.setState(
        {
          loading: false,
          error: apolloError,
        },
        () => {
          callOnError();
        }
      );
    } else {
      callOnError();
    }
  };

  private generateNewMutationId = (): number => {
    this.mostRecentMutationId = this.mostRecentMutationId + 1;
    return this.mostRecentMutationId;
  };

  private isMostRecentMutation = (mutationId: number) => {
    return this.mostRecentMutationId === mutationId;
  };

  private verifyDocumentIsMutation = (mutation: DocumentNode) => {
    const operation = parser(mutation);
    invariant(
      operation.type === DocumentType.Mutation,
      `The <Mutation /> component requires a graphql mutation, but got a ${
        operation.type === DocumentType.Query ? 'query' : 'subscription'
      }.`
    );
  };

  private verifyContext = (context: MutationContext) => {
    invariant(
      !!context.client,
      `Could not find "client" in the context of Mutation. Wrap the root component in an <ApolloProvider>`
    );
  };
}

export default Mutation;
