import React from 'react';
import { OperationVariables } from '@apollo/react-components';
import { IDocumentDefinition } from '@apollo/react-common';
export declare const defaultMapPropsToOptions: () => {};
export declare const defaultMapResultToProps: <P>(props: P) => P;
export declare const defaultMapPropsToSkip: () => boolean;
export declare function getDisplayName<P>(WrappedComponent: React.ComponentType<P>): string;
export declare function calculateVariablesFromProps<TProps>(operation: IDocumentDefinition, props: TProps): OperationVariables;
export declare type RefSetter<TChildProps> = (ref: React.ComponentClass<TChildProps>) => void | void;
export declare class GraphQLBase<TProps, TChildProps, TState = any> extends React.Component<TProps, TState> {
    withRef: boolean;
    private wrappedInstance?;
    constructor(props: TProps);
    getWrappedInstance(): React.ComponentClass<TChildProps, any> | undefined;
    setWrappedInstance(ref: React.ComponentClass<TChildProps>): void;
}
