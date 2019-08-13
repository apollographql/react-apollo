import { GraphQLRequest, FetchResult } from 'apollo-link';
import { ApolloClient, DefaultOptions, Resolvers } from 'apollo-client';
import { ApolloCache } from 'apollo-cache';
import { ApolloLink } from 'apollo-link';

export type ResultFunction<T> = () => T;

export interface MockedResponse {
  request: GraphQLRequest;
  result?: FetchResult | ResultFunction<FetchResult>;
  error?: Error;
  delay?: number;
  newData?: ResultFunction<FetchResult>;
}

export interface MockedSubscriptionResult {
  result?: FetchResult;
  error?: Error;
  delay?: number;
}

export interface MockedProviderProps<TSerializedCache = {}> {
  mocks?: ReadonlyArray<MockedResponse>;
  addTypename?: boolean;
  defaultOptions?: DefaultOptions;
  cache?: ApolloCache<TSerializedCache>;
  resolvers?: Resolvers;
  childProps?: object;
  children?: React.ReactElement;
  link?: ApolloLink;
}

export interface MockedProviderState {
  client: ApolloClient<any>;
}
