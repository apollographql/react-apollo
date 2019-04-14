import { ApolloClient } from 'apollo-client';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { DocumentNode } from 'graphql';
export declare function createClient<TData>(data: TData, query: DocumentNode, variables?: {}): ApolloClient<NormalizedCacheObject>;
