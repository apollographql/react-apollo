import * as React from 'react';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { ApolloProvider } from './index';
import { MockLink } from './test-links';
export * from './test-links';

export class MockedProvider extends React.Component<any, any> {
  static defaultProps = {
    addTypename: true,
  };

  private client: any;

  constructor(props: any, context: any) {
    super(props, context);
    const link = new MockLink(this.props.mocks, this.props.addTypename);
    this.client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: this.props.addTypename }),
      defaultOptions: this.props.defaultOptions,
    });
  }

  render() {
    return <ApolloProvider client={this.client}>{this.props.children}</ApolloProvider>;
  }
}
