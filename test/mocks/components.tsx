
import * as React from 'react';

export class Passthrough extends React.Component<any, any> {
  render() {
    return <span {...this.props} />;
  }
};

export class ProviderMock extends React.Component<any, any> {

  static propTypes = {
    store: React.PropTypes.shape({
      subscribe: React.PropTypes.func.isRequired,
      dispatch: React.PropTypes.func.isRequired,
      getState: React.PropTypes.func.isRequired,
    }),
    client: React.PropTypes.object.isRequired,
    children: React.PropTypes.element.isRequired,
  };

  static childContextTypes = {
    store: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
  };

  public store: any;
  public client: any;

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
    return React.Children.only(children);
  }
};
