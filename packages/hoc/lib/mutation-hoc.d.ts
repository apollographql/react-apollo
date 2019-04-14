import React from 'react';
import { DocumentNode } from 'graphql';
import { OperationOption, MutateProps } from '@apollo/react-components';
export declare function withMutation<TProps extends TGraphQLVariables | {} = {}, TData = {}, TGraphQLVariables = {}, TChildProps = MutateProps<TData, TGraphQLVariables>>(document: DocumentNode, operationOptions?: OperationOption<TProps, TData, TGraphQLVariables, TChildProps>): (WrappedComponent: React.ComponentType<TProps & TChildProps>) => React.ComponentClass<TProps, any>;
