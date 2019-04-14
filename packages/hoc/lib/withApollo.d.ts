import React from 'react';
import { OperationOption } from '@apollo/react-components';
import { ApolloClient } from 'apollo-client';
export declare type WithApolloClient<P> = P & {
    client: ApolloClient<any>;
};
export declare function withApollo<TProps, TResult = any>(WrappedComponent: React.ComponentType<WithApolloClient<TProps>>, operationOptions?: OperationOption<TProps, TResult>): React.ComponentClass<TProps>;
