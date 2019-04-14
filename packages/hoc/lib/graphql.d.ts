/// <reference types="react" />
import { DocumentNode } from 'graphql';
import { OperationOption, DataProps, MutateProps } from '@apollo/react-components';
export declare function graphql<TProps extends TGraphQLVariables | {} = {}, TData = {}, TGraphQLVariables = {}, TChildProps = Partial<DataProps<TData, TGraphQLVariables>> & Partial<MutateProps<TData, TGraphQLVariables>>>(document: DocumentNode, operationOptions?: OperationOption<TProps, TData, TGraphQLVariables, TChildProps>): (WrappedComponent: import("react").ComponentType<TProps & TChildProps>) => import("react").ComponentClass<TProps, any>;
