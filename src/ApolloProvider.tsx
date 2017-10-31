import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';

import ApolloClient from 'apollo-client';
import QueryRecyclerProvider from './QueryRecyclerProvider';

const invariant = require('invariant');

export interface ProviderProps<Cache> {
  client?: ApolloClient<Cache>;
  clients?: Map<string, ApolloClient<Cache>>;
  defaultClient?: ApolloClient<Cache>;
}

export default class ApolloProvider extends Component<
  ProviderProps<Cache>,
  any
> {
  static propTypes = {
    client: PropTypes.object,
    clients: PropTypes.object,
    defaultClient: PropTypes.object,
    children: PropTypes.element.isRequired,
  };

  static childContextTypes = {
    client: PropTypes.object,
    clients: PropTypes.object,
    defaultClient: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);

    invariant(
      !!props.client || (!!props.clients && !!props.defaultClient),
      'ApolloClient was not passed a client or clients. Make sure ' +
        'you pass in your client(s) via the "client" or "clients" & "defaultClient" props.',
    );
  }

  getChildContext() {
    return {
      client: this.props.client,
      clients: this.props.clients,
      defaultClient: this.props.defaultClient || this.props.client,
    };
  }

  render() {
    return (
      <QueryRecyclerProvider>
        {React.Children.only(this.props.children)}
      </QueryRecyclerProvider>
    );
  }
}
