import { Operation, GraphQLRequest, ApolloLink, FetchResult, Observable } from 'apollo-link';
declare type ResultFunction<T> = () => T;
export interface MockedResponse {
    request: GraphQLRequest;
    result?: FetchResult | ResultFunction<FetchResult>;
    error?: Error;
    delay?: number;
    newData?: ResultFunction<FetchResult>;
}
export declare class MockLink extends ApolloLink {
    addTypename: Boolean;
    private mockedResponsesByKey;
    constructor(mockedResponses: ReadonlyArray<MockedResponse>, addTypename?: Boolean);
    addMockedResponse(mockedResponse: MockedResponse): void;
    request(operation: Operation): Observable<{}>;
    private normalizeMockedResponse;
}
export declare function mockSingleLink(...mockedResponses: Array<any>): ApolloLink;
export {};
