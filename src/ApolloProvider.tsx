import * as React from 'react';
import ApolloClient from 'apollo-client';
import { DocumentNode } from 'graphql';
import ApolloContext from './context';

const invariant = require('invariant');

export interface ApolloProviderProps<TCache> {
  client: ApolloClient<TCache>;
  children: React.ReactNode;
}

export default class ApolloProvider<TCache> extends React.Component<ApolloProviderProps<TCache>> {

  private operations: Map<string, { query: DocumentNode; variables: any }> = new Map();

  constructor(props: ApolloProviderProps<TCache>, context: any) {
    super(props, context);

    invariant(
      props.client,
      'ApolloProvider was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );

    // we have to attach to the client since you could have multiple
    // providers
    // XXX this is backwards compat and will be removed in 3.0
    if (!(props.client as any).__operations_cache__) {
      (props.client as any).__operations_cache__ = this.operations;
    }
  }

  render() {
    const { children, client } = this.props;
    return (
      <ApolloContext.Provider
        value={{
          client: client,
          operations: (client as any).__operations_cache__
        }}>
        {children}
      </ApolloContext.Provider>
    )
  }
}
