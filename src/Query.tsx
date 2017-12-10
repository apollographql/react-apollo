import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { ObservableQuery } from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import * as invariant from 'invariant';
import * as pick from 'lodash.pick';

import shallowEqual from './shallowEqual';
import ApolloConsumer from './ApolloConsumer';

import {
  MutationOpts,
  ChildProps,
  OperationOption,
  ComponentDecorator,
  QueryOpts,
  QueryProps,
  MutationFunc,
  OptionProps,
} from './types';

type Props = {
  query: DocumentNode;
  options?: QueryOpts;
  skip?: Boolean;
  loading?: () => React.ReactNode;
  error?: (error: any) => React.ReactNode;
  render?: (result: any) => React.ReactNode;
};

type State = {
  result: any;
};

function observableQueryFields(observable) {
  const fields = pick(
    observable,
    'variables',
    'refetch',
    'fetchMore',
    'updateQuery',
    'startPolling',
    'stopPolling',
  );

  Object.keys(fields).forEach(key => {
    if (typeof fields[key] === 'function') {
      fields[key] = fields[key].bind(observable);
    }
  });

  return fields;
}

class Query extends React.Component<Props, State> {
  private client: ApolloClient<any>;
  private queryObservable: ObservableQuery<any>;
  private querySubscription: ZenObservable.Subscription;

  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    invariant(
      !!context.client,
      `Could not find "client" in the context of Query. Wrap the root component in an <ApolloProvider>`,
    );
    this.client = context.client;

    this._initializeQueryObservable(props);
    this.state = {
      result: this.queryObservable.currentResult(),
    };
  }

  componentDidMount() {
    if (this.props.skip) {
      return;
    }
    this._startQuerySubscription();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (shallowEqual(this.props, nextProps)) {
      return;
    }

    if (nextProps.skip) {
      if (!this.props.skip) {
        this._removeQuerySubscription();
      }
      return;
    }
    this._removeQuerySubscription();
    this._initializeQueryObservable(nextProps);
    this._startQuerySubscription();
    this._updateCurrentData();
  }

  componentWillUnmount() {
    this._removeQuerySubscription();
  }

  _initializeQueryObservable = props => {
    const { options, query } = props;

    const clientOptions = { ...options, query };

    this.queryObservable = this.client.watchQuery(clientOptions);
  };

  _startQuerySubscription = () => {
    this.querySubscription = this.queryObservable.subscribe({
      next: this._updateCurrentData,
      error: this._updateCurrentData,
    });
  };

  _removeQuerySubscription = () => {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
  };
  _updateCurrentData = () => {
    this.setState({ result: this.queryObservable.currentResult() });
  };

  getRenderProps = () => {
    const { result } = this.state;

    const { loading, error, networkStatus, data } = result;

    const renderProps = {
      data,
      loading,
      error,
      networkStatus,
      ...observableQueryFields(this.queryObservable),
    };

    return renderProps;
  };

  render() {
    const { render, loading, error } = this.props;
    const result = this.getRenderProps();

    if (result.loading && loading) {
      return loading();
    }

    if (result.error && error) {
      return error(result.error);
    }

    return render(result);
  }
}

export default Query;
