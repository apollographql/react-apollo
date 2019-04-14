import React from 'react';
import PropTypes from 'prop-types';
import ApolloClient, { ApolloError, FetchPolicy } from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ApolloContextValue } from '@apollo/react-common';
import { OperationVariables } from './types';
export interface SubscriptionResult<TData = any> {
    loading: boolean;
    data?: TData;
    error?: ApolloError;
}
export interface OnSubscriptionDataOptions<TData = any> {
    client: ApolloClient<Object>;
    subscriptionData: SubscriptionResult<TData>;
}
export interface SubscriptionProps<TData = any, TVariables = OperationVariables> {
    subscription: DocumentNode;
    variables?: TVariables;
    fetchPolicy?: FetchPolicy;
    shouldResubscribe?: any;
    client?: ApolloClient<Object>;
    onSubscriptionData?: (options: OnSubscriptionDataOptions<TData>) => any;
    onSubscriptionComplete?: () => void;
    children?: (result: SubscriptionResult<TData>) => React.ReactNode;
}
export interface SubscriptionState<TData = any> {
    loading: boolean;
    data?: TData;
    error?: ApolloError;
}
export declare class Subscription<TData = any, TVariables = any> extends React.Component<SubscriptionProps<TData, TVariables>, SubscriptionState<TData>> {
    static contextType: React.Context<ApolloContextValue>;
    static propTypes: {
        subscription: PropTypes.Validator<object>;
        variables: PropTypes.Requireable<object>;
        children: PropTypes.Requireable<(...args: any[]) => any>;
        onSubscriptionData: PropTypes.Requireable<(...args: any[]) => any>;
        onSubscriptionComplete: PropTypes.Requireable<(...args: any[]) => any>;
        shouldResubscribe: PropTypes.Requireable<boolean | ((...args: any[]) => any)>;
    };
    private client;
    private previousState?;
    private previousProps?;
    private observableQuery?;
    private observableQuerySubscription?;
    constructor(props: SubscriptionProps<TData, TVariables>, context: ApolloContextValue);
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): any;
    private initialize;
    private startSubscription;
    private getInitialState;
    private updateCurrentData;
    private updateError;
    private completeSubscription;
    private endSubscription;
    private newClient;
}
