import * as React from 'react';
import ApolloClient from 'apollo-client';
import { DefaultOptions } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { ApolloProvider } from './index';
import { MockedResponse, MockLink } from './test-links';
import { ApolloCache } from 'apollo-cache';
export * from './test-links';

export interface MockedProviderProps<TSerializedCache = {}> {
  mocks?: ReadonlyArray<MockedResponse>;
  addTypename?: boolean;
  defaultOptions?: DefaultOptions;
  cache?: ApolloCache<TSerializedCache>;
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

    const { mocks, addTypename, defaultOptions, cache } = this.props;
    const client = new ApolloClient({
      cache: cache || new Cache({ addTypename }),
      defaultOptions,
      link: new MockLink(mocks || [], addTypename),
    });

    this.state = { client };
  }

  public render() {
    return <ApolloProvider client={this.state.client}>{this.props.children}</ApolloProvider>;
  }

  public componentWillUnmount() {
    // Since this.state.client was created in the constructor, it's this
    // MockedProvider's responsibility to terminate it.
    this.state.client.stop();
  }
}
