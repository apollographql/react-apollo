import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { ApolloError, FetchPolicy } from 'apollo-client';
import { Observable } from 'apollo-link';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';

import { OperationVariables } from './types';
import { getClient } from './component-utils';
import shallowEqual from './utils/shallowEqual';
import { getApolloContext, ApolloContextValue } from './ApolloContext';

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
  static contextType = getApolloContext();

  static propTypes = {
    subscription: PropTypes.object.isRequired,
    variables: PropTypes.object,
    children: PropTypes.func,
    onSubscriptionData: PropTypes.func,
    onSubscriptionComplete: PropTypes.func,
    shouldResubscribe: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  };

  private client: ApolloClient<object>;
  private previousState?: Readonly<SubscriptionState<TData>>;
  private previousProps?: Readonly<SubscriptionProps<TData, TVariables>>;
  private observableQuery?: Observable<any>;
  private observableQuerySubscription?: ZenObservable.Subscription;

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

  componentWillUnmount() {
    this.endSubscription();
  }

  render() {
    let currentState = this.state;

    if (this.newClient()) {
      currentState = this.getInitialState();
    }

    let { shouldResubscribe } = this.props;
    if (typeof shouldResubscribe === 'function') {
      shouldResubscribe = !!shouldResubscribe(this.props);
    }

    if (
      shouldResubscribe !== false &&
      this.previousProps &&
      (!shallowEqual(this.previousProps.variables, this.props.variables) ||
      this.previousProps.subscription !== this.props.subscription)
    ) {
      this.endSubscription();
      delete this.observableQuery;

      if (!this.previousState) {
        currentState = this.getInitialState();
      }
    }

    this.initialize(this.props);
    this.startSubscription();

    const renderFn: any = this.props.children;
    if (!renderFn) return null;

    const result = { ...currentState, variables: this.props.variables };
    this.previousState = currentState;
    this.previousProps = this.props;
    return renderFn(result);
  }

  private initialize = (props: SubscriptionProps<TData, TVariables>) => {
    if (this.observableQuery) return;
    this.observableQuery = this.client.subscribe({
      query: props.subscription,
      variables: props.variables,
      fetchPolicy: props.fetchPolicy,
    });
  };

  private startSubscription = () => {
    if (this.observableQuerySubscription) return;
    this.observableQuerySubscription = this.observableQuery!.subscribe({
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
    const { props: { onSubscriptionData } } = this;

    if (onSubscriptionData) {
      onSubscriptionData({
        client: this.client,
        subscriptionData: result
      });
    }

    this.setState({
      data: result.data,
      loading: false,
      error: undefined,
    }, () => {
      delete this.previousState;
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
    if (this.observableQuerySubscription) {
      this.observableQuerySubscription.unsubscribe();
      delete this.observableQuerySubscription;
    }
  };

  private newClient = () => {
    let clientChanged = false;
    const client = getClient(this.props, this.context);
    if (client !== this.client) {
      clientChanged = true;
      this.client = client;
      this.endSubscription();
      delete this.observableQuery;
    }
    return clientChanged;
  };
}

export default Subscription;
