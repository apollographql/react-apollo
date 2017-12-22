import * as React from 'react';
import * as PropTypes from 'prop-types';
import { ObservableQueryRecycler } from './queryRecycler';

class QueryRecyclerProvider extends React.Component {
  static propTypes = {
    children: PropTypes.element.isRequired,
  };

  static contextTypes = {
    client: PropTypes.object,
  };

  static childContextTypes = {
    getQueryRecycler: PropTypes.func.isRequired,
  };

  private recyclers: WeakMap<React.Component, ObservableQueryRecycler>;

  constructor(props) {
    super(props);
    this.recyclers = new WeakMap();
    this.getQueryRecycler = this.getQueryRecycler.bind(this);
  }

  componentWillReceiveProps(_, nextContext) {
    if (this.context.client !== nextContext.client) {
      this.recyclers = new WeakMap();
    }
  }

  getQueryRecycler(component) {
    if (!this.recyclers.has(component)) {
      this.recyclers.set(component, new ObservableQueryRecycler());
    }
    return this.recyclers.get(component);
  }

  getChildContext() {
    return {
      getQueryRecycler: this.getQueryRecycler,
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
}

export default QueryRecyclerProvider;
