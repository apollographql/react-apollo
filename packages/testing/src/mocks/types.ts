import { GraphQLRequest, FetchResult } from 'apollo-link';

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
