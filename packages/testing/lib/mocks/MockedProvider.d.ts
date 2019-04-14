import React from 'react';
import { ApolloClient, DefaultOptions, Resolvers } from 'apollo-client';
import { ApolloCache } from 'apollo-cache';
import { MockedResponse } from './mockLink';
export interface MockedProviderProps<TSerializedCache = {}> {
    mocks?: ReadonlyArray<MockedResponse>;
    addTypename?: boolean;
    defaultOptions?: DefaultOptions;
    cache?: ApolloCache<TSerializedCache>;
    resolvers?: Resolvers;
    childProps?: object;
    children?: React.ReactElement;
}
export interface MockedProviderState {
    client: ApolloClient<any>;
}
export declare class MockedProvider extends React.Component<MockedProviderProps, MockedProviderState> {
    static defaultProps: MockedProviderProps;
    constructor(props: MockedProviderProps);
    render(): JSX.Element | null;
    componentWillUnmount(): void;
}
