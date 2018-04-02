import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { ApolloError } from 'apollo-client';
import { Observable } from 'apollo-link';

import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables } from './types';

const shallowEqual = require('fbjs/lib/shallowEqual');
const invariant = require('invariant');

export interface SubscriptionResult<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

export interface SubscriptionProps<TData = any, TVariables = OperationVariables> {
  subscription: DocumentNode;
  variables?: TVariables;
  shouldResubscribe?: boolean;
  children: (result: SubscriptionResult<TData>) => React.ReactNode;
}

export interface SubscriptionState<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

export interface SubscriptionContext {
  client: ApolloClient<Object>;
}

class Subscription<TData = any, TVariables = any> extends React.Component<
  SubscriptionProps<TData, TVariables>,
  SubscriptionState<TData>
> {
  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  static propTypes = {
    subscription: PropTypes.object.isRequired,
    variables: PropTypes.object,
    children: PropTypes.func.isRequired,
  };

  private client: ApolloClient<any>;
  private queryObservable: Observable<any>;
  private querySubscription: ZenObservable.Subscription;

  constructor(props: SubscriptionProps<TData, TVariables>, context: SubscriptionContext) {
    super(props, context);

    invariant(
      !!context.client,
      `Could not find "client" in the context of Subscription. Wrap the root component in an <ApolloProvider>`,
    );
    this.client = context.client;
    this.initialize(props);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    this.startSubscription();
  }

  componentWillReceiveProps(
    nextProps: SubscriptionProps<TData, TVariables>,
    nextContext: SubscriptionContext,
  ) {
    if (shallowEqual(this.props, nextProps) && this.client === nextContext.client) {
      return;
    }
    const shouldNotResubscribe = this.props.shouldResubscribe === false;
    if (this.client !== nextContext.client) {
      this.client = nextContext.client;
    }

    if (!shouldNotResubscribe) {
      this.endSubscription();
      delete this.queryObservable;
      this.initialize(nextProps);
      this.startSubscription();
      this.setState(this.getInitialState());
      return;
    }
    this.initialize(nextProps);
    this.startSubscription();
  }

  componentWillUnmount() {
    this.endSubscription();
  }

  render() {
    const result = Object.assign({}, this.state, {
      variables: this.props.variables,
    });
    return this.props.children(result);
  }

  private initialize = (props: SubscriptionProps<TData, TVariables>) => {
    if (this.queryObservable) return;
    this.queryObservable = this.client.subscribe({
      query: props.subscription,
      variables: props.variables,
    });
  };

  private startSubscription = () => {
    if (this.querySubscription) return;
    this.querySubscription = this.queryObservable.subscribe({
      next: this.updateCurrentData,
      error: this.updateError,
    });
  };

  private getInitialState = () => ({
    loading: true,
    error: undefined,
    data: undefined,
  });

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
      delete this.querySubscription;
    }
  };
}

export default Subscription;
