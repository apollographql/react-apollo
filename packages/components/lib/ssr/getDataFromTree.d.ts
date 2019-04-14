import React from 'react';
import { ApolloClient, ObservableQuery } from 'apollo-client';
import { ApolloContextValue } from '@apollo/react-common';
import { Query } from '../Query';
export declare class RenderPromises {
    private queryPromises;
    private queryInfoTrie;
    registerSSRObservable<TData, TVariables>(queryInstance: Query<TData, TVariables>, observable: ObservableQuery<any, TVariables>): void;
    getSSRObservable<TData, TVariables>(queryInstance: Query<TData, TVariables>): ObservableQuery<any, any> | null;
    addQueryPromise<TData, TVariables>(queryInstance: Query<TData, TVariables>, finish: () => React.ReactNode, client: ApolloClient<object>, context: ApolloContextValue): React.ReactNode;
    hasPromises(): boolean;
    consumeAndAwaitPromises(): Promise<any[]>;
    private lookupQueryInfo;
}
export declare function getDataFromTree(tree: React.ReactNode, context?: {
    [key: string]: any;
}): Promise<string>;
export declare type GetMarkupFromTreeOptions = {
    tree: React.ReactNode;
    context?: {
        [key: string]: any;
    };
    renderFunction?: (tree: React.ReactElement<any>) => string;
};
export declare function getMarkupFromTree({ tree, context, renderFunction, }: GetMarkupFromTreeOptions): Promise<string>;
