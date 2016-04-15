/// <reference path="../typings/main.d.ts" />

import {
  Component,
  PropTypes,
  Children,
} from 'react';

import {
  Store
} from 'redux';

// XXX add in type defs from apollo-client
// import ApolloClient from "apollo-client"

export declare interface ProviderProps {
  store: Store<any>;
  client: any;
}

export default class Provider extends Component<ProviderProps, any> {
  public store: Store<any>;
  // public client: ApolloClient;
  public client: any;

  static propTypes = {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired
    }),
    client: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
  }

  static childContextTypes = {
    store: PropTypes.object.isRequired,
    client: PropTypes.object.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.client = props.client;
    this.store = props.store
  }

  getChildContext() {
    return {
      store: this.store,
      client: this.client,
    }
  }

  render(){
    const { children } = this.props
    return Children.only(children)
  }
}