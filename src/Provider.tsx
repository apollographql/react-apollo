/// <reference path="../typings/main.d.ts" />

import {
  Component,
  PropTypes,
  Children,
} from 'react';

import {
  Store,
} from 'redux';

import ApolloClient from 'apollo-client';

export declare interface ProviderProps {
  store?: Store<any>;
  client: ApolloClient;
}

export default class Provider extends Component<ProviderProps, any> {
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
    store: PropTypes.object.isRequired,
    client: PropTypes.object.isRequired,
  };

  public store: Store<any>;
  public client: ApolloClient;

  constructor(props, context) {
    super(props, context);
    this.client = props.client;

    if (props.store) {
      this.store = props.store;
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
    const { children } = this.props;
    return Children.only(children);
  }
};
