import { isEqual } from 'apollo-utilities';
import { Observable } from 'apollo-link';
import { ZenObservable } from 'zen-observable-ts';
import { ApolloContextValue } from '@apollo/react-common';

import {
  SubscriptionState,
  SubscriptionProps,
  SubscriptionResult
} from '../types';
import { OperationCore } from './OperationCore';

export class SubscriptionCore<
  TData = any,
  TVariables = any
> extends OperationCore<SubscriptionProps<TData, TVariables>> {
  private setResult: any;
  private previousProps?: Readonly<SubscriptionProps<TData, TVariables>>;
  private observableQuery?: Observable<any>;
  private observableQuerySubscription?: ZenObservable.Subscription;

  constructor(
    props: SubscriptionProps<TData, TVariables>,
    context: ApolloContextValue,
    setResult: any
  ) {
    super(props, context);
    this.setResult = setResult;
    this.initialize(props);
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

  public afterRender() {
    this.isMounted = true;
    return this.unmount.bind(this);
  }

  protected cleanup() {
    this.endSubscription();
    delete this.observableQuery;
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
}
