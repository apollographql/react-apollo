import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';
import ApolloClient from 'apollo-client';
import QueryRecyclerProvider from './QueryRecyclerProvider';
import ApolloContext from './ApolloContext';

const invariant = require('invariant');

export interface ApolloProviderProps<TCache> {
  client: ApolloClient<TCache>;
  children: React.ReactNode;
}

export default class ApolloProvider<TCache> extends Component<
  ApolloProviderProps<TCache>
> {
  static propTypes = {
    client: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
  };

  constructor(props: ApolloProviderProps<TCache>) {
    super(props);

    invariant(
      props.client,
      'ApolloClient was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );
  }

  render() {
    return (
      <ApolloContext.Provider value={this.props.client}>
        <QueryRecyclerProvider>
          {React.Children.only(this.props.children)}
        </QueryRecyclerProvider>
      </ApolloContext.Provider>
    );
  }
}
