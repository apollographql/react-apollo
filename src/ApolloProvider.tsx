import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';

import ApolloClient, { ApolloStore } from 'apollo-client';
import QueryRecyclerProvider from './QueryRecyclerProvider';

const invariant = require('invariant');

export interface ProviderProps<Cache> {
  client: ApolloClient<Cache>;
}

export default class ApolloProvider extends Component<ProviderProps, any> {
  static propTypes = {
    client: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
  };

  static childContextTypes = {
    client: PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    invariant(
      props.client,
      'ApolloClient was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );
  }

  getChildContext() {
    return {
      client: this.props.client,
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
