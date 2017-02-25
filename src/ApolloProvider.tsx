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
  as?: string;
};

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
    as: PropTypes.string,
  };
  static defaultProps = {
    as: 'default',
  };

  static contextTypes = { apolloClients: PropTypes.object };
  static childContextTypes = {
    apolloClients: PropTypes.object.isRequired,
    store: PropTypes.object.isRequired,
  };

  public store: Store<any>;
  public client: ApolloClient;
  public previousClients: Object;
  public as: string;

  constructor(props, context) {
    super(props, context);

    invariant(
      props.client,
      'ApolloClient was not passed a client instance. Make ' +
      'sure you pass in your client via the "client" prop.'
    );

    this.previousClients = context.apolloClients || {};
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
    // can be replaced with object spread from typescript 2.1
    return {
      apolloClients: Object.assign(
        {}, this.previousClients, { [this.props.as]: this.client }
      ),
      store: this.store,
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
};
