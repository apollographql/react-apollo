import * as React from 'react';
import ApolloClient from 'apollo-client';

import {
  NetworkInterface,
  Request,
} from 'apollo-client/networkInterface';

import {
  GraphQLResult,
  Document,
} from 'graphql';

import { print } from 'graphql-tag/printer';


import ApolloProvider from './ApolloProvider';

export class MockedProvider extends React.Component<any, any> {
  private client: any;

  constructor(props, context) {
    super(props, context);

    const networkInterface = mockNetworkInterface.apply(null, this.props.mocks);
    this.client = new ApolloClient({ networkInterface });
  }

  render() {
    return (
      <ApolloProvider client={this.client}>
        {this.props.children}
      </ApolloProvider>
    );
  }
}

// Pass in multiple mocked responses, so that you can test flows that end up
// making multiple queries to the server
export function mockNetworkInterface(
  ...mockedResponses: MockedResponse[]
): NetworkInterface {
  return new MockNetworkInterface(...mockedResponses);
}

export interface ParsedRequest {
  variables?: Object;
  query?: Document;
  debugName?: string;
}

export interface MockedResponse {
  request: ParsedRequest;
  result?: GraphQLResult;
  error?: Error;
  delay?: number;
  newData?: () => any;
}

export class MockNetworkInterface implements NetworkInterface {
  private mockedResponsesByKey: { [key: string]: MockedResponse[] } = {};

  constructor(...mockedResponses: MockedResponse[]) {
    mockedResponses.forEach((mockedResponse) => {
      this.addMockedReponse(mockedResponse);
    });
  }

  public addMockedReponse(mockedResponse: MockedResponse) {
    const key = requestToKey(mockedResponse.request);
    let mockedResponses = this.mockedResponsesByKey[key];
    if (!mockedResponses) {
      mockedResponses = [];
      this.mockedResponsesByKey[key] = mockedResponses;
    }
    mockedResponses.push(mockedResponse);
  }

  public query(request: Request) {
    return new Promise((resolve, reject) => {
      const parsedRequest: ParsedRequest = {
        query: request.query,
        variables: request.variables,
        debugName: request.debugName,
      };

      const key = requestToKey(parsedRequest);

      if (!this.mockedResponsesByKey[key]) {
        throw new Error('No more mocked responses for the query: ' + print(request.query));
      }

      const original = [...this.mockedResponsesByKey[key]];
      const { result, error, delay, newData } = this.mockedResponsesByKey[key].shift() || {} as any;

      if (newData) {
        original[0].result = newData();
        this.mockedResponsesByKey[key].push(original[0]);
      }

      if (!result && !error) {
        throw new Error(`Mocked response should contain either result or error: ${key}`);
      }

      setTimeout(() => {
        if (error) return reject(error);
        return resolve(result);
      }, delay ? delay : 1);
    });
  }
}

function requestToKey(request: ParsedRequest): string {
  const queryString = request.query && print(request.query);
  return JSON.stringify({
    variables: request.variables,
    debugName: request.debugName,
    query: queryString,
  });
}
