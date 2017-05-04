import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Component } from 'react';

import { Store } from 'redux';

import ApolloClient, { ApolloStore } from 'apollo-client';

import invariant = require('invariant');

export declare interface ProviderProps {
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

    if (!props.store) {
      props.client.initStore();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.client !== this.props.client && !nextProps.store) {
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
    return React.Children.only(this.props.children);
  }
}
