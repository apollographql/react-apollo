import { ApolloClient } from 'apollo-client';
import { isEqual } from 'apollo-utilities';
import { Observable } from 'apollo-link';
import { ZenObservable } from 'zen-observable-ts';
import { ApolloContextValue } from '@apollo/react-common';

import { getClient } from '../utils/getClient';
import {
  SubscriptionState,
  SubscriptionProps,
  SubscriptionResult
} from '../types';

export class SubscriptionCore<TData = any, TVariables = any> {
  public isMounted: boolean = true;

  private client: ApolloClient<object>;
  private props: SubscriptionProps<TData, TVariables>;
  private context: ApolloContextValue;
  private setResult: any;
  private previousProps?: Readonly<SubscriptionProps<TData, TVariables>>;
  private observableQuery?: Observable<any>;
  private observableQuerySubscription?: ZenObservable.Subscription;

  constructor(
    props: SubscriptionProps<TData, TVariables>,
    context: ApolloContextValue,
    setResult: any
  ) {
    this.props = props;
    this.context = context;
    this.setResult = setResult;
    this.client = this.refreshClient().client;
    this.initialize(props);
  }

  public setProps(props: SubscriptionProps<TData, TVariables>) {
    this.props = props;
  }

  public setContext(context: ApolloContextValue) {
    this.context = context;
  }

  public render(result: SubscriptionState<TData>) {
    let currentResult = result;

    if (this.refreshClient().isNew) {
      currentResult = this.getLoadingResult();
    }

    let { shouldResubscribe } = this.props;
    if (typeof shouldResubscribe === 'function') {
      shouldResubscribe = !!shouldResubscribe(this.props);
    }

    if (
      shouldResubscribe !== false &&
      this.previousProps &&
      (!isEqual(this.previousProps.variables, this.props.variables) ||
        this.previousProps.subscription !== this.props.subscription)
    ) {
      this.endSubscription();
      delete this.observableQuery;
      currentResult = this.getLoadingResult();
    }

    this.initialize(this.props);
    this.startSubscription();

    const renderFn: any = this.props.children;
    if (!renderFn) return null;

    this.previousProps = this.props;
    return renderFn({ ...currentResult, variables: this.props.variables });
  }

  public onAfterExecute() {
    this.endSubscription();
  }

  private initialize(props: SubscriptionProps<TData, TVariables>) {
    if (this.observableQuery) return;
    this.observableQuery = this.refreshClient().client.subscribe({
      query: props.subscription,
      variables: props.variables,
      fetchPolicy: props.fetchPolicy
    });
  }

  private startSubscription() {
    if (this.observableQuerySubscription) return;
    this.observableQuerySubscription = this.observableQuery!.subscribe({
      next: this.updateCurrentData.bind(this),
      error: this.updateError.bind(this),
      complete: this.completeSubscription.bind(this)
    });
  }

  private getLoadingResult() {
    return {
      loading: true,
      error: undefined,
      data: undefined
    };
  }

  private updateResult(result: SubscriptionState) {
    if (this.isMounted) {
      this.setResult(result);
    }
  }

  private updateCurrentData(result: SubscriptionResult<TData>) {
    const {
      props: { onSubscriptionData }
    } = this;

    if (onSubscriptionData) {
      onSubscriptionData({
        client: this.refreshClient().client,
        subscriptionData: result
      });
    }

    this.updateResult({
      data: result.data,
      loading: false,
      error: undefined
    });
  }

  private updateError(error: any) {
    this.updateResult({
      error,
      loading: false
    });
  }

  private completeSubscription() {
    const { onSubscriptionComplete } = this.props;
    if (onSubscriptionComplete) onSubscriptionComplete();
    this.endSubscription();
  }

  private endSubscription() {
    if (this.observableQuerySubscription) {
      this.observableQuerySubscription.unsubscribe();
      delete this.observableQuerySubscription;
    }
  }

  private refreshClient() {
    let isNew = false;
    const client = getClient(this.props, this.context);
    if (client !== this.client) {
      isNew = true;
      this.client = client;
      this.endSubscription();
      delete this.observableQuery;
    }
    return {
      client: this.client,
      isNew
    };
  }
}
