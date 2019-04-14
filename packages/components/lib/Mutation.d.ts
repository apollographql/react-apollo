import React from 'react';
import PropTypes from 'prop-types';
import ApolloClient, { PureQueryOptions, ApolloError, FetchPolicy } from 'apollo-client';
import { DataProxy } from 'apollo-cache';
import { DocumentNode, GraphQLError } from 'graphql';
import { ApolloContextValue } from '@apollo/react-common';
import { OperationVariables, RefetchQueriesProviderFn } from './types';
export interface MutationResult<TData = Record<string, any>> {
    data?: TData;
    error?: ApolloError;
    loading: boolean;
    called: boolean;
    client: ApolloClient<Object>;
}
export interface ExecutionResult<T = Record<string, any>> {
    data?: T;
    extensions?: Record<string, any>;
    errors?: GraphQLError[];
}
export declare type MutationUpdaterFn<T = {
    [key: string]: any;
}> = (proxy: DataProxy, mutationResult: FetchResult<T>) => void;
export declare type FetchResult<TData = Record<string, any>, C = Record<string, any>, E = Record<string, any>> = ExecutionResult<TData> & {
    extensions?: E;
    context?: C;
};
export declare type MutationOptions<TData = Record<string, any>, TVariables = OperationVariables> = {
    variables?: TVariables;
    optimisticResponse?: TData;
    refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
    awaitRefetchQueries?: boolean;
    update?: MutationUpdaterFn<TData>;
    context?: Record<string, any>;
    fetchPolicy?: FetchPolicy;
};
export declare type MutationFn<TData = any, TVariables = OperationVariables> = (options?: MutationOptions<TData, TVariables>) => Promise<void | FetchResult<TData>>;
export interface MutationProps<TData = any, TVariables = OperationVariables> {
    client?: ApolloClient<Object>;
    mutation: DocumentNode;
    ignoreResults?: boolean;
    optimisticResponse?: TData;
    variables?: TVariables;
    refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
    awaitRefetchQueries?: boolean;
    update?: MutationUpdaterFn<TData>;
    children: (mutateFn: MutationFn<TData, TVariables>, result: MutationResult<TData>) => React.ReactNode;
    onCompleted?: (data: TData) => void;
    onError?: (error: ApolloError) => void;
    context?: Record<string, any>;
    fetchPolicy?: FetchPolicy;
}
export interface MutationState<TData = any> {
    called: boolean;
    loading: boolean;
    error?: ApolloError;
    data?: TData;
}
export declare class Mutation<TData = any, TVariables = OperationVariables> extends React.Component<MutationProps<TData, TVariables>, MutationState<TData>> {
    static contextType: React.Context<ApolloContextValue>;
    static propTypes: {
        mutation: PropTypes.Validator<object>;
        variables: PropTypes.Requireable<object>;
        optimisticResponse: PropTypes.Requireable<object>;
        refetchQueries: PropTypes.Requireable<((...args: any[]) => any) | (string | object | null)[]>;
        awaitRefetchQueries: PropTypes.Requireable<boolean>;
        update: PropTypes.Requireable<(...args: any[]) => any>;
        children: PropTypes.Validator<(...args: any[]) => any>;
        onCompleted: PropTypes.Requireable<(...args: any[]) => any>;
        onError: PropTypes.Requireable<(...args: any[]) => any>;
        fetchPolicy: PropTypes.Requireable<string>;
    };
    private mostRecentMutationId;
    private hasMounted;
    constructor(props: MutationProps<TData, TVariables>, context: ApolloContextValue);
    componentDidMount(): void;
    componentDidUpdate(prevProps: MutationProps<TData, TVariables>): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
    private runMutation;
    private mutate;
    private onMutationStart;
    private onMutationCompleted;
    private onMutationError;
    private generateNewMutationId;
    private isMostRecentMutation;
    private verifyDocumentIsMutation;
    private currentClient;
}
