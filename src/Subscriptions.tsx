import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, { ApolloError } from 'apollo-client';
import { Observable } from 'apollo-client/util/Observable';

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

export interface SubscriptionProps<
  TData = any,
  TVariables = OperationVariables
> {
  query: DocumentNode;
  variables?: TVariables;
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
    query: PropTypes.object.isRequired,
    variables: PropTypes.object,
    children: PropTypes.func.isRequired,
  };

  private client: ApolloClient<any>;
  private queryObservable: Observable<any>;
  private querySubscription: ZenObservable.Subscription;

  constructor(
    props: SubscriptionProps<TData, TVariables>,
    context: SubscriptionContext,
  ) {
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
    if (
      shallowEqual(this.props, nextProps) &&
      this.client === nextContext.client
    ) {
      return;
    }

    if (this.client !== nextContext.client) {
      this.client = nextContext.client;
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

  private initialize = (props: SubscriptionProps<TData, TVariables>) => {
    this.queryObservable = this.client.subscribe({
      query: props.query,
      variables: props.variables,
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

export default Subscription;
