import { ApolloError } from 'apollo-client';
import { isEqual } from 'apollo-utilities';
import { invariant } from 'ts-invariant';
import { DocumentNode } from 'graphql';
import { parser, DocumentType, ApolloContextValue } from '@apollo/react-common';

import {
  OperationVariables,
  MutationProps,
  MutationOptions,
  MutationState,
  ExecutionResult
} from '../types';
import { getClient } from '../utils/getClient';

export class MutationCore<TData = any, TVariables = OperationVariables> {
  public isMounted: boolean = true;

  private mostRecentMutationId: number;
  private result: MutationState<TData>;
  private previousResult?: MutationState<TData>;
  private setResult: any;

  constructor({
    props,
    result,
    setResult
  }: {
    props: MutationProps<TData, TVariables>;
    result: MutationState<TData>;
    setResult: any;
  }) {
    this.verifyDocumentIsMutation(props.mutation);
    this.result = result;
    this.setResult = setResult;
    this.mostRecentMutationId = 0;
  }

  public runMutation(
    props: MutationProps<TData, TVariables>,
    context: ApolloContextValue,
    options: MutationOptions<TData, TVariables> = {}
  ) {
    this.onMutationStart(props);
    const mutationId = this.generateNewMutationId();

    return this.mutate(props, context, options)
      .then((response: ExecutionResult<TData>) => {
        this.onMutationCompleted(props, response, mutationId);
        return response;
      })
      .catch((e: ApolloError) => {
        this.onMutationError(props, e, mutationId);
        if (!props.onError) throw e;
      });
  }

  private mutate(
    props: MutationProps<TData, TVariables>,
    context: ApolloContextValue,
    options: MutationOptions<TData, TVariables>
  ) {
    const {
      mutation,
      variables,
      optimisticResponse,
      update,
      context: mutationContext = {},
      awaitRefetchQueries = false,
      fetchPolicy
    } = props;
    const mutateOptions = { ...options };

    let refetchQueries = mutateOptions.refetchQueries || props.refetchQueries;
    const mutateVariables = Object.assign(
      {},
      variables,
      mutateOptions.variables
    );
    delete mutateOptions.variables;

    return this.currentClient(props, context).mutate({
      mutation,
      optimisticResponse,
      refetchQueries,
      awaitRefetchQueries,
      update,
      context: mutationContext,
      fetchPolicy,
      variables: mutateVariables,
      ...mutateOptions
    });
  }

  private onMutationStart(props: MutationProps<TData, TVariables>) {
    if (!this.result.loading && !props.ignoreResults) {
      this.updateResult({
        loading: true,
        error: undefined,
        data: undefined,
        called: true
      });
    }
  }

  private onMutationCompleted(
    props: MutationProps<TData, TVariables>,
    response: ExecutionResult<TData>,
    mutationId: number
  ) {
    const { onCompleted, ignoreResults } = props;

    const { data, errors } = response;
    const error =
      errors && errors.length > 0
        ? new ApolloError({ graphQLErrors: errors })
        : undefined;

    const callOncomplete = () =>
      onCompleted ? onCompleted(data as TData) : null;

    if (this.isMostRecentMutation(mutationId) && !ignoreResults) {
      this.updateResult({
        called: true,
        loading: false,
        data,
        error
      });
    }
    callOncomplete();
  }

  private onMutationError(
    props: MutationProps<TData, TVariables>,
    error: ApolloError,
    mutationId: number
  ) {
    const { onError } = props;
    const callOnError = () => (onError ? onError(error) : null);

    if (this.isMostRecentMutation(mutationId)) {
      this.updateResult({
        loading: false,
        error,
        data: undefined,
        called: true
      });
    }
    callOnError();
  }

  private generateNewMutationId(): number {
    this.mostRecentMutationId += 1;
    return this.mostRecentMutationId;
  }

  private isMostRecentMutation(mutationId: number) {
    return this.mostRecentMutationId === mutationId;
  }

  private verifyDocumentIsMutation(mutation: DocumentNode) {
    const operation = parser(mutation);
    invariant(
      operation.type === DocumentType.Mutation,
      `The <Mutation /> component requires a graphql mutation, but got a ${
        operation.type === DocumentType.Query ? 'query' : 'subscription'
      }.`
    );
  }

  private currentClient(
    props: MutationProps<TData, TVariables>,
    context: ApolloContextValue
  ) {
    return getClient(props, context);
  }

  private updateResult(result: MutationState<TData>) {
    if (
      this.isMounted &&
      (!this.previousResult || !isEqual(this.previousResult, result))
    ) {
      this.setResult(result);
      this.previousResult = result;
    }
  }
}
