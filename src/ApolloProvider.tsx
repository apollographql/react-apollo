import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';

import { Store } from 'redux';

import ApolloClient, { ApolloStore } from 'apollo-client';
import QueryRecyclerProvider from './QueryRecyclerProvider';

const invariant = require('invariant');

export interface ProviderProps {
  store?: Store<any>;
  client: ApolloClient;
}

export default class ApolloProvider extends Component<ProviderProps, any> {
  static propTypes = {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired,
    }),
    client: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
  };

  static childContextTypes = {
    store: PropTypes.object,
    client: PropTypes.object.isRequired,
  };

  static contextTypes = {
    store: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);

    invariant(
      props.client,
      'ApolloClient was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );

    if (!props.store && typeof props.client.initStore === 'function') {
      props.client.initStore();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.client !== this.props.client &&
      !nextProps.store &&
      typeof nextProps.client.initStore === 'function'
    ) {
      nextProps.client.initStore();
    }
  }

  getChildContext() {
    return {
      store: this.props.store || this.context.store,
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
