import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { PureQueryOptions, ApolloError, FetchPolicy } from 'apollo-client';
import { DataProxy } from 'apollo-cache';
import invariant from './utils/invariant';
import { DocumentNode, GraphQLError } from 'graphql';
import shallowEqual from './utils/shallowEqual';

import { OperationVariables, RefetchQueriesProviderFn } from './types';
import { parser, DocumentType } from './parser';
import { getClient } from './component-utils';

export interface MutationResult<TData = Record<string, any>> {
  data?: TData;
  error?: ApolloError;
  loading: boolean;
  called: boolean;
  client: ApolloClient<Object>;
}
export interface MutationContext {
  client?: ApolloClient<Object>;
  operations: Map<string, { query: DocumentNode; variables: any }>;
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
  TData = Record<string, any>,
  C = Record<string, any>,
  E = Record<string, any>
> = ExecutionResult<TData> & {
  extensions?: E;
  context?: C;
};

export declare type MutationOptions<
  TData = Record<string, any>,
  TVariables = OperationVariables
> = {
  variables?: TVariables;
  optimisticResponse?: TData;
  refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
  awaitRefetchQueries?: boolean;
  update?: MutationUpdaterFn<TData>;
  context?: Record<string, any>;
  fetchPolicy?: FetchPolicy;
};

export declare type MutationFn<TData = any, TVariables = OperationVariables> = (
  options?: MutationOptions<TData, TVariables>,
) => Promise<void | FetchResult<TData>>;

export interface MutationProps<TData = any, TVariables = OperationVariables> {
  client?: ApolloClient<Object>;
  mutation: DocumentNode;
  ignoreResults?: boolean;
  optimisticResponse?: TData;
  variables?: TVariables;
  refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
  awaitRefetchQueries?: boolean;
  update?: MutationUpdaterFn<TData>;
  children: (
    mutateFn: MutationFn<TData, TVariables>,
    result: MutationResult<TData>,
  ) => React.ReactNode;
  onCompleted?: (data: TData) => void;
  onError?: (error: ApolloError) => void;
  context?: Record<string, any>;
  fetchPolicy?: FetchPolicy;
}

export interface MutationState<TData = any> {
  called: boolean;
  error?: ApolloError;
  data?: TData;
  loading: boolean;
}

const initialState = {
  loading: false,
  called: false,
  error: undefined,
  data: undefined,
};

class Mutation<TData = any, TVariables = OperationVariables> extends React.Component<
  MutationProps<TData, TVariables>,
  MutationState<TData>
> {
  static contextTypes = {
    client: PropTypes.object,
    operations: PropTypes.object,
  };

  static propTypes = {
    mutation: PropTypes.object.isRequired,
    variables: PropTypes.object,
    optimisticResponse: PropTypes.object,
    refetchQueries: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
      PropTypes.func,
    ]),
    awaitRefetchQueries: PropTypes.bool,
    update: PropTypes.func,
    children: PropTypes.func.isRequired,
    onCompleted: PropTypes.func,
    onError: PropTypes.func,
    fetchPolicy: PropTypes.string,
  };

  private client: ApolloClient<any>;
  private mostRecentMutationId: number;

  private hasMounted: boolean = false;

  constructor(props: MutationProps<TData, TVariables>, context: any) {
    super(props, context);
    this.client = getClient(props, context);
    this.verifyDocumentIsMutation(props.mutation);
    this.mostRecentMutationId = 0;
    this.state = initialState;
  }

  componentDidMount() {
    this.hasMounted = true;
  }

  componentWillUnmount() {
    this.hasMounted = false;
  }

  componentWillReceiveProps(
    nextProps: MutationProps<TData, TVariables>,
    nextContext: MutationContext,
  ) {
    const nextClient = getClient(nextProps, nextContext);
    if (shallowEqual(this.props, nextProps) && this.client === nextClient) {
      return;
    }

    if (this.props.mutation !== nextProps.mutation) {
      this.verifyDocumentIsMutation(nextProps.mutation);
    }

    if (this.client !== nextClient) {
      this.client = nextClient;
      this.setState(initialState);
    }
  }

  render() {
    const { children } = this.props;
    const { loading, data, error, called } = this.state;

    const result = {
      called,
      loading,
      data,
      error,
      client: this.client,
    };

    return children(this.runMutation, result);
  }

  private runMutation = (options: MutationOptions<TData, TVariables> = {}) => {
    this.onMutationStart();
    const mutationId = this.generateNewMutationId();

    return this.mutate(options)
      .then((response: ExecutionResult<TData>) => {
        this.onMutationCompleted(response, mutationId);
        return response;
      })
      .catch((e: ApolloError) => {
        this.onMutationError(e, mutationId);
        if (!this.props.onError) throw e;
      });
  };

  private mutate = (options: MutationOptions<TData, TVariables>) => {
    const {
      mutation,
      variables,
      optimisticResponse,
      update,
      context = {},
      awaitRefetchQueries = false,
      fetchPolicy,
    } = this.props;
    const mutateOptions = { ...options };

    let refetchQueries = mutateOptions.refetchQueries || this.props.refetchQueries;
    // XXX this will be removed in the 3.0 of Apollo Client. Currently, we
    // support refectching of named queries which just pulls the latest
    // variables to match. This forces us to either a) keep all queries around
    // to be able to iterate over and refetch, or b) [new in 2.1] keep a map of
    // operations on the client where operation name => { query, variables }
    //
    // Going forward, we should only allow using the full operation + variables to
    // refetch.
    if (refetchQueries && refetchQueries.length && Array.isArray(refetchQueries)) {
      refetchQueries = (refetchQueries as any).map((x: string | PureQueryOptions) => {
        if (typeof x === 'string' && this.context.operations)
          return this.context.operations.get(x) || x;
        return x;
      });
      delete mutateOptions.refetchQueries;
    }

    const mutateVariables = Object.assign({}, variables, mutateOptions.variables);
    delete mutateOptions.variables;

    return this.client.mutate({
      mutation,
      optimisticResponse,
      refetchQueries,
      awaitRefetchQueries,
      update,
      context,
      fetchPolicy,
      variables: mutateVariables,
      ...mutateOptions,
    });
  };

  private onMutationStart = () => {
    if (!this.state.loading && !this.props.ignoreResults) {
      this.setState({
        loading: true,
        error: undefined,
        data: undefined,
        called: true,
      });
    }
  };

  private onMutationCompleted = (response: ExecutionResult<TData>, mutationId: number) => {
    const { onCompleted, ignoreResults } = this.props;

    const { data, errors } = response;
    const error =
      errors && errors.length > 0 ? new ApolloError({ graphQLErrors: errors }) : undefined;

    const callOncomplete = () => (onCompleted ? onCompleted(data as TData) : null);

    if (this.hasMounted && this.isMostRecentMutation(mutationId) && !ignoreResults) {
      this.setState({ loading: false, data, error }, callOncomplete);
    } else {
      callOncomplete();
    }
  };

  private onMutationError = (error: ApolloError, mutationId: number) => {
    const { onError } = this.props;
    const callOnError = () => (onError ? onError(error) : null);

    if (this.hasMounted && this.isMostRecentMutation(mutationId)) {
      this.setState({ loading: false, error }, callOnError);
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
      }.`,
    );
  };
}

export default Mutation;
