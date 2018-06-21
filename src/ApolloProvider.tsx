import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';
import ApolloClient from 'apollo-client';
import { DocumentNode } from 'graphql';

const invariant = require('invariant');

export interface ApolloProviderProps<TCache> {
  client: ApolloClient<TCache>;
  children: React.ReactNode;
}

export default class ApolloProvider<TCache> extends Component<ApolloProviderProps<TCache>> {
  static propTypes = {
    client: PropTypes.object.isRequired,
    children: PropTypes.node.isRequired,
  };

  static childContextTypes = {
    client: PropTypes.object.isRequired,
    operations: PropTypes.object,
  };

  private operations: Map<string, { query: DocumentNode; variables: any }> = new Map();

  constructor(props: ApolloProviderProps<TCache>, context: any) {
    super(props, context);

    invariant(
      props.client,
      'ApolloClient was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );

    // we have to attach to the client since you could have multiple
    // providers
    // XXX this is backwards compat and will be removed in 3.0
    if (!(props.client as any).__operations_cache__) {
      (props.client as any).__operations_cache__ = this.operations;
    }
  }

  getChildContext() {
    return {
      client: this.props.client,
      operations: (this.props.client as any).__operations_cache__,
    };
  }

  render() {
    return this.props.children;
  }
}
