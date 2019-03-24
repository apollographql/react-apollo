import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { ApolloError, FetchPolicy } from 'apollo-client';
import { Observable } from 'apollo-link';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';

import { OperationVariables } from './types';
import { getClient } from './component-utils';
import shallowEqual from './utils/shallowEqual';
import { ApolloContext, ApolloContextValue } from './ApolloContext';

export interface SubscriptionResult<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

export interface OnSubscriptionDataOptions<TData = any> {
  client: ApolloClient<Object>;
  subscriptionData: SubscriptionResult<TData>;
}

export interface SubscriptionProps<TData = any, TVariables = OperationVariables> {
  subscription: DocumentNode;
  variables?: TVariables;
  fetchPolicy?: FetchPolicy;
  shouldResubscribe?: any;
  client?: ApolloClient<Object>;
  onSubscriptionData?: (options: OnSubscriptionDataOptions<TData>) => any;
  onSubscriptionComplete?: () => void;
  children?: (result: SubscriptionResult<TData>) => React.ReactNode;
}

export interface SubscriptionState<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

class Subscription<TData = any, TVariables = any> extends React.Component<
  SubscriptionProps<TData, TVariables>,
  SubscriptionState<TData>
> {
  static contextType = ApolloContext;

  static propTypes = {
    subscription: PropTypes.object.isRequired,
    variables: PropTypes.object,
    children: PropTypes.func,
    onSubscriptionData: PropTypes.func,
    onSubscriptionComplete: PropTypes.func,
    shouldResubscribe: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  };

  private client: ApolloClient<any>;
  private queryObservable?: Observable<any>;
  private querySubscription?: ZenObservable.Subscription;

  constructor(
    props: SubscriptionProps<TData, TVariables>,
    context: ApolloContextValue,
  ) {
    super(props, context);
    this.client = getClient(props, context);

    this.initialize(props);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    this.startSubscription();
  }

  componentWillReceiveProps(nextProps: SubscriptionProps<TData, TVariables>) {
    const nextClient = getClient(nextProps, this.context);

    if (
      shallowEqual(this.props.variables, nextProps.variables) &&
      this.client === nextClient &&
      this.props.subscription === nextProps.subscription
    ) {
      return;
    }

    let shouldResubscribe = nextProps.shouldResubscribe;
    if (typeof shouldResubscribe === 'function') {
      shouldResubscribe = !!shouldResubscribe(this.props, nextProps);
    }
    const shouldNotResubscribe = shouldResubscribe === false;
    if (this.client !== nextClient) {
      this.client = nextClient;
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
    const renderFn: any = this.props.children;
    if (!renderFn) return null;
    const result = Object.assign({}, this.state, {
      variables: this.props.variables,
    });
    return renderFn(result);
  }

  private initialize = (props: SubscriptionProps<TData, TVariables>) => {
    if (this.queryObservable) return;
    this.queryObservable = this.client.subscribe({
      query: props.subscription,
      variables: props.variables,
      fetchPolicy: props.fetchPolicy,
    });
  };

  private startSubscription = () => {
    if (this.querySubscription) return;
    this.querySubscription = this.queryObservable!.subscribe({
      next: this.updateCurrentData,
      error: this.updateError,
      complete: this.completeSubscription
    });
  };

  private getInitialState = () => ({
    loading: true,
    error: undefined,
    data: undefined,
  });

  private updateCurrentData = (result: SubscriptionResult<TData>) => {
    const {
      client,
      props: { onSubscriptionData },
    } = this;
    if (onSubscriptionData) onSubscriptionData({ client, subscriptionData: result });
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

  private completeSubscription = () => {
    const { onSubscriptionComplete } = this.props;
    if (onSubscriptionComplete) onSubscriptionComplete();
    this.endSubscription();
  };

  private endSubscription = () => {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
      delete this.querySubscription;
    }
  };
}

export default Subscription;
