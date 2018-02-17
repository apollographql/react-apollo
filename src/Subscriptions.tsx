import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { ApolloError } from 'apollo-client';
import { Observable } from 'apollo-client/util/Observable';

import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables } from './types';
import ApolloConsumer from "./ApolloConsumer";

const shallowEqual = require('fbjs/lib/shallowEqual');

export interface SubscriptionResult<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

export interface SubscriptionProps<
  TData = any,
  TVariables = OperationVariables
> {
  query: DocumentNode;
  variables?: TVariables;
  children: (result: SubscriptionResult<TData>) => React.ReactNode;
}

export interface InnerSubscriptionProps<TData = any, TVariables = OperationVariables> extends SubscriptionProps<TData, TVariables> {
  client: ApolloClient<any>
};

export interface SubscriptionState<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

class InnerSubscription<TData = any, TVariables = any> extends React.Component<
  InnerSubscriptionProps<TData, TVariables>,
  SubscriptionState<TData>
> {
  static propTypes = {
    query: PropTypes.object.isRequired,
    variables: PropTypes.object,
    children: PropTypes.func.isRequired,
    client: PropTypes.object.isRequired
  };

  private queryObservable: Observable<any>;
  private querySubscription: ZenObservable.Subscription;

  constructor(
    props: InnerSubscriptionProps<TData, TVariables>,
  ) {
    super(props);

    this.initialize(props);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    this.startSubscription();
  }

  componentWillReceiveProps(
    nextProps: InnerSubscriptionProps<TData, TVariables>,
  ) {
    if (
      shallowEqual(this.props, nextProps)
    ) {
      return;
    }

    this.endSubscription();
    this.initialize(nextProps);
    this.startSubscription();
    this.setState(this.getInitialState());
  }

  componentWillUnmount() {
    this.endSubscription();
  }

  render() {
    const { loading, error, data } = this.state;
    const result = {
      loading,
      error,
      data,
    };
    return this.props.children(result);
  }

  private initialize = (props: InnerSubscriptionProps<TData, TVariables>) => {
    const { query, variables, client } = props;
    this.queryObservable = client.subscribe({
      query,
      variables,
    });
  };

  private startSubscription = () => {
    this.querySubscription = this.queryObservable.subscribe({
      next: this.updateCurrentData,
      error: this.updateError,
    });
  };

  private getInitialState = () => {
    return {
      loading: true,
      error: undefined,
      data: undefined,
    };
  };

  private updateCurrentData = (result: SubscriptionResult<TData>) => {
    this.setState({
      data: result.data,
      loading: false,
      error: undefined,
    });
  };

  private updateError = (error: any) => {
    this.setState({
      error,
      loading: false,
    });
  };

  private endSubscription = () => {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
  };
}

class Subscription<TData = any, TVariables = OperationVariables> extends React.Component<SubscriptionProps<TData, TVariables>> {
  render() {
    return (
      <ApolloConsumer>
        {client => (
          <InnerSubscription {...this.props} client={client} />
        )}
      </ApolloConsumer>
    )
  }
}

export default Subscription;
