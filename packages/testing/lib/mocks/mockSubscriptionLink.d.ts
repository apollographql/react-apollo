import { GraphQLRequest, ApolloLink, FetchResult, Observable } from 'apollo-link';
export interface MockedSubscriptionResult {
    result?: FetchResult;
    error?: Error;
    delay?: number;
}
export interface MockedSubscription {
    request: GraphQLRequest;
}
export declare class MockSubscriptionLink extends ApolloLink {
    unsubscribers: any[];
    setups: any[];
    private observer;
    constructor();
    request(_req: any): Observable<FetchResult<{
        [key: string]: any;
    }, Record<string, any>, Record<string, any>>>;
    simulateResult(result: MockedSubscriptionResult, complete?: boolean): void;
    onSetup(listener: any): void;
    onUnsubscribe(listener: any): void;
}
export declare function mockObservableLink(): MockSubscriptionLink;
