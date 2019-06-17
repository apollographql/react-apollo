import {
  Operation,
  GraphQLRequest,
  ApolloLink,
  FetchResult,
  Observable,
  // Observer,
} from 'apollo-link';
import stringify from 'fast-json-stable-stringify';

import { print } from 'graphql/language/printer';
import {
  addTypenameToDocument,
  removeClientSetsFromDocument,
  removeConnectionDirectiveFromDocument,
  cloneDeep,
} from 'apollo-utilities';
const isEqual = require('lodash.isequal');

type ResultFunction<T> = () => T;

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

export interface MockedSubscription {
  request: GraphQLRequest;
}

export class MockLink extends ApolloLink {
  public addTypename: Boolean = true;
  private mockedResponsesByKey: { [key: string]: MockedResponse[] } = {};

  constructor(mockedResponses: ReadonlyArray<MockedResponse>, addTypename: Boolean = true) {
    super();
    this.addTypename = addTypename;
    if (mockedResponses)
      mockedResponses.forEach(mockedResponse => {
        this.addMockedResponse(mockedResponse);
      });
  }

  public addMockedResponse(mockedResponse: MockedResponse) {
    const normalizedMockedResponse =
      this.normalizeMockedResponse(mockedResponse);
    const key = requestToKey(normalizedMockedResponse.request, this.addTypename);
    let mockedResponses = this.mockedResponsesByKey[key];
    if (!mockedResponses) {
      mockedResponses = [];
      this.mockedResponsesByKey[key] = mockedResponses;
    }
    mockedResponses.push(normalizedMockedResponse);
  }

  public request(operation: Operation) {
    const key = requestToKey(operation, this.addTypename);
    let responseIndex;
    const response = (this.mockedResponsesByKey[key] || []).find((res, index) => {
      const requestVariables = operation.variables || {};
      const mockedResponseVariables = res.request.variables || {};
      if (!isEqual(stringify(requestVariables), stringify(mockedResponseVariables))) {
        return false;
      }
      responseIndex = index;
      return true;
    });

    if (!response || typeof responseIndex === 'undefined') {
      throw new Error(
        `No more mocked responses for the query: ${print(
          operation.query,
        )}, variables: ${JSON.stringify(operation.variables)}`,
      );
    }

    this.mockedResponsesByKey[key].splice(responseIndex, 1);

    const { result, error, delay, newData } = response;

    if (newData) {
      response.result = newData();
      this.mockedResponsesByKey[key].push(response);
    }

    if (!result && !error) {
      throw new Error(`Mocked response should contain either result or error: ${key}`);
    }

    return new Observable(observer => {
      let timer = setTimeout(() => {
        if (error) {
          observer.error(error);
        } else {
          if (result) {
            observer.next(
              typeof result === 'function'
                ? (result as ResultFunction<FetchResult>)()
                : result
            );
          }
          observer.complete();
        }
      }, delay ? delay : 0);

      return () => {
        clearTimeout(timer);
      };
    });
  }

  private normalizeMockedResponse(
    mockedResponse: MockedResponse
  ): MockedResponse {
    const newMockedResponse = cloneDeep(mockedResponse);
    newMockedResponse.request.query =
      removeConnectionDirectiveFromDocument(newMockedResponse.request.query);
    const query = removeClientSetsFromDocument(newMockedResponse.request.query);
    if (query) {
      newMockedResponse.request.query = query;
    }
    return newMockedResponse;
  }
}

export class MockSubscriptionLink extends ApolloLink {
  public unsubscribers: any[] = [];
  public setups: any[] = [];

  private observer: any;

  constructor() {
    super();
  }

  public request(_req: any) {
    return new Observable<FetchResult>(observer => {
      this.setups.forEach(x => x());
      this.observer = observer;
      return () => {
        this.unsubscribers.forEach(x => x());
      };
    });
  }

  public simulateResult(result: MockedSubscriptionResult, complete = false) {
    setTimeout(() => {
      const { observer } = this;
      if (!observer) throw new Error('subscription torn down');
      if (complete && observer.complete) observer.complete();
      if (result.result && observer.next) observer.next(result.result);
      if (result.error && observer.error) observer.error(result.error);
    }, result.delay || 0);
  }

  public onSetup(listener: any): void {
    this.setups = this.setups.concat([listener]);
  }

  public onUnsubscribe(listener: any): void {
    this.unsubscribers = this.unsubscribers.concat([listener]);
  }
}

function requestToKey(request: GraphQLRequest, addTypename: Boolean): string {
  const queryString =
    request.query &&
    print(addTypename ? addTypenameToDocument(request.query) : request.query);
  const requestKey = { query: queryString };
  return JSON.stringify(requestKey);
}

// Pass in multiple mocked responses, so that you can test flows that end up
// making multiple queries to the server
// NOTE: The last arg can optionally be an `addTypename` arg
export function mockSingleLink(...mockedResponses: Array<any>): ApolloLink {
  // to pull off the potential typename. If this isn't a boolean, we'll just set it true later
  let maybeTypename = mockedResponses[mockedResponses.length - 1];
  let mocks = mockedResponses.slice(0, mockedResponses.length - 1);

  if (typeof maybeTypename !== 'boolean') {
    mocks = mockedResponses;
    maybeTypename = true;
  }

  return new MockLink(mocks, maybeTypename);
}

export function mockObservableLink(): MockSubscriptionLink {
  return new MockSubscriptionLink();
}
