import { useContext, useState, useRef, useEffect } from 'react';
import { DocumentNode } from 'graphql';
import { ApolloError } from 'apollo-client';
import { getApolloContext, OperationVariables } from '@apollo/react-common';

import { SubscriptionHookOptions } from './types';
import { SubscriptionData } from './data/SubscriptionData';

export type UseSubscription<TData = any, TVariables = OperationVariables> = (
  query: DocumentNode,
  options?: SubscriptionHookOptions<TData, TVariables>
) => {
  variables: TVariables;
  loading: boolean;
  data?: TData;
  error?: ApolloError;
};

export function useSubscription<TData = any, TVariables = OperationVariables>(
  subscription: DocumentNode,
  options?: SubscriptionHookOptions<TData, TVariables>
) {
  const context = useContext(getApolloContext());
  const updatedOptions = options
    ? { ...options, subscription }
    : { subscription };
  const [result, setResult] = useState({
    loading: !updatedOptions.skip,
    error: undefined,
    data: undefined
  });

  const subscriptionDataRef = useRef<SubscriptionData<TData, TVariables>>();
  function getSubscriptionDataRef() {
    if (!subscriptionDataRef.current) {
      subscriptionDataRef.current = new SubscriptionData<TData, TVariables>({
        options: updatedOptions,
        context,
        setResult
      });
    }
    return subscriptionDataRef.current;
  }

  const subscriptionData = getSubscriptionDataRef();
  subscriptionData.setOptions(updatedOptions, true);
  subscriptionData.context = context;

  useEffect(() => subscriptionData.afterExecute());
  useEffect(() => subscriptionData.cleanup.bind(subscriptionData), []);

  return subscriptionData.execute(result);
}
