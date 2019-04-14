import React from 'react';
import PropTypes from 'prop-types';
import ApolloClient, { ObservableQuery, ApolloError, ApolloQueryResult, NetworkStatus, FetchMoreOptions, FetchMoreQueryOptions } from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ApolloContextValue } from '@apollo/react-common';
import { OperationVariables, QueryOpts } from './types';
export declare type ObservableQueryFields<TData, TVariables> = Pick<ObservableQuery<TData, TVariables>, 'startPolling' | 'stopPolling' | 'subscribeToMore' | 'updateQuery' | 'refetch' | 'variables'> & {
    fetchMore: (<K extends keyof TVariables>(fetchMoreOptions: FetchMoreQueryOptions<TVariables, K> & FetchMoreOptions<TData, TVariables>) => Promise<ApolloQueryResult<TData>>) & (<TData2, TVariables2, K extends keyof TVariables2>(fetchMoreOptions: {
        query: DocumentNode;
    } & FetchMoreQueryOptions<TVariables2, K> & FetchMoreOptions<TData2, TVariables2>) => Promise<ApolloQueryResult<TData2>>);
};
export interface QueryResult<TData = any, TVariables = OperationVariables> extends ObservableQueryFields<TData, TVariables> {
    client: ApolloClient<any>;
    data: TData | undefined;
    error?: ApolloError;
    loading: boolean;
    networkStatus: NetworkStatus;
}
export interface QueryProps<TData = any, TVariables = OperationVariables> extends QueryOpts<TVariables> {
    children: (result: QueryResult<TData, TVariables>) => React.ReactNode;
    query: DocumentNode;
    displayName?: string;
    skip?: boolean;
    onCompleted?: (data: TData) => void;
    onError?: (error: ApolloError) => void;
}
export declare class Query<TData = any, TVariables = OperationVariables> extends React.Component<QueryProps<TData, TVariables>> {
    static propTypes: {
        client: PropTypes.Requireable<object>;
        children: PropTypes.Validator<(...args: any[]) => any>;
        fetchPolicy: PropTypes.Requireable<string>;
        notifyOnNetworkStatusChange: PropTypes.Requireable<boolean>;
        onCompleted: PropTypes.Requireable<(...args: any[]) => any>;
        onError: PropTypes.Requireable<(...args: any[]) => any>;
        pollInterval: PropTypes.Requireable<number>;
        query: PropTypes.Validator<object>;
        variables: PropTypes.Requireable<object>;
        ssr: PropTypes.Requireable<boolean>;
        partialRefetch: PropTypes.Requireable<boolean>;
    };
    private previousClient?;
    private observableQuery?;
    private observableQuerySubscription?;
    private previousQuery?;
    private hasMounted;
    private operation?;
    private previousOptions;
    private previousResult;
    componentDidMount(): void;
    componentDidUpdate(prevProps: QueryProps<TData, TVariables>): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
    fetchData(client: ApolloClient<object>, context: ApolloContextValue): Promise<ApolloQueryResult<any>> | boolean;
    private extractOptsFromProps;
    private initializeObservableQuery;
    private updateObservableQuery;
    private startQuerySubscription;
    private removeQuerySubscription;
    private resubscribeToQuery;
    private updateCurrentData;
    private handleErrorOrCompleted;
    private getQueryResult;
    private currentClient;
    private renderData;
}
