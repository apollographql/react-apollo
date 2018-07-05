import * as React from 'react';
import ApolloClient from 'apollo-client';
import { DefaultOptions } from 'apollo-client/ApolloClient';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { ApolloProvider } from './index';
import { MockedResponse, MockLink } from './test-links';
export * from './test-links';

export interface MockedProviderProps {
  mocks?: MockedResponse[];
  addTypename?: boolean;
  defaultOptions?: DefaultOptions;
}

export interface MockedProviderState {
  client: ApolloClient<any>;
}

export class MockedProvider extends React.Component<MockedProviderProps, MockedProviderState> {
  public static defaultProps: MockedProviderProps = {
    addTypename: true,
  };

  constructor(props: MockedProviderProps) {
    super(props);

    const { mocks, addTypename, defaultOptions } = this.props;
    const client = new ApolloClient({
      cache: new Cache({ addTypename }),
      defaultOptions,
      link: new MockLink(mocks || [], addTypename),
    });

    this.state = { client };
  }

  public render() {
    return <ApolloProvider client={this.state.client}>{this.props.children}</ApolloProvider>;
  }

  public componentWillUnmount() {
    const scheduler = this.state.client.queryManager.scheduler;
    Object.keys(scheduler.registeredQueries).forEach(queryId => {
      scheduler.stopPollingQuery(queryId);
    });
    Object.keys(scheduler.intervalQueries).forEach((interval: any) => {
      scheduler.fetchQueriesOnInterval(interval);
    });
  }
}
