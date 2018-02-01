import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';
import ApolloClient from 'apollo-client';
import QueryRecyclerProvider from './QueryRecyclerProvider';
import invariant from 'invariant';

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

  static childContextTypes = {
    client: PropTypes.object.isRequired,
  };

  constructor(props: ApolloProviderProps<TCache>, context: any) {
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
