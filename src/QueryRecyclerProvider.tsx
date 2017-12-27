import * as React from 'react';
import * as PropTypes from 'prop-types';
import { ObservableQueryRecycler } from './queryRecycler';

export interface QueryRecyclerProviderProps {
  children: React.ReactNode;
}

class QueryRecyclerProvider extends React.Component<
  QueryRecyclerProviderProps
> {
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

  constructor(props: QueryRecyclerProviderProps) {
    super(props);
    this.recyclers = new WeakMap();
    this.getQueryRecycler = this.getQueryRecycler.bind(this);
  }

  componentWillReceiveProps(_: any, nextContext: any) {
    if (this.context.client !== nextContext.client) {
      this.recyclers = new WeakMap();
    }
  }

  getQueryRecycler(component: React.Component) {
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
    return this.props.children;
  }
}

export default QueryRecyclerProvider;
