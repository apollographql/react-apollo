/* tslint:disable:no-unused-variable */
import * as React from 'react';
/* tslint:enable:no-unused-variable */
import {
  Component,
  PropTypes,
} from 'react';

import {
  Store,
} from 'redux';

/* tslint:disable:no-unused-variable */
import ApolloClient, { ApolloStore } from 'apollo-client';
/* tslint:enable:no-unused-variable */

import invariant = require('invariant');

export declare interface ProviderProps {
  store?: Store<any>;
  immutable?: boolean;
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
    immutable: PropTypes.bool,
    children: PropTypes.element.isRequired,
  };

  static childContextTypes = {
    store: PropTypes.object.isRequired,
    client: PropTypes.object.isRequired,
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

  shouldComponentUpdate(nextProps) {
    return this.props.client !== nextProps.client ||
      this.props.store !== nextProps.store ||
      this.props.children !== nextProps.children;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.client !== this.props.client && !nextProps.store) {
      nextProps.client.initStore();
    }
  }

  getChildContext() {
    return {
      store: this.props.store || this.props.client.store,
      client: this.props.client,
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
};
