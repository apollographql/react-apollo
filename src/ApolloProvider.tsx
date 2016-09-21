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

import ApolloClient from 'apollo-client';

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

  public store: Store<any>;
  public client: ApolloClient;

  constructor(props, context) {
    super(props, context);

    invariant(
      props.client,
      'ApolloClient was not passed a client instance. Make ' +
      'sure you pass in your client via the "client" prop.'
    );

    // warn if client is using deprecated apollo client reduxRootKey prop
    if (props.client.reduxRootKey) {
      console.warn(`
        Property 'reduxRootKey' from apollo client deprecated and its usage
        will be removed from the next releases.
        Use 'reduxRootSelector' instead when creating the apollo client.
      `);
    }

    this.client = props.client;

    if (props.store) {
      this.store = props.store;
      // support an immutable store alongside apollo store
      if (props.immutable) props.client.initStore();
      return;
    }

    // intialize the built in store if none is passed in
    props.client.initStore();
    this.store = props.client.store;

  }

  getChildContext() {
    return {
      store: this.store,
      client: this.client,
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
};
