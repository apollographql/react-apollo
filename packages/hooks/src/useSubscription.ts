import { useContext, useState, useRef, useEffect } from 'react';
import { DocumentNode } from 'graphql';
import {
  getApolloContext,
  OperationVariables,
  SubscriptionOptions
} from '@apollo/react-common';

import { SubscriptionData } from './data/SubscriptionData';

export function useSubscription<TData = any, TVariables = OperationVariables>(
  subscription: DocumentNode,
  options?: SubscriptionOptions<TData, TVariables>
) {
  const context = useContext(getApolloContext());
  const [result, setResult] = useState({
    loading: true,
    error: undefined,
    data: undefined
  });
  const updatedOptions = options
    ? { ...options, subscription }
    : { subscription };

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
  subscriptionData.options = updatedOptions;
  subscriptionData.context = context;

  useEffect(() => {
    return subscriptionData.afterExecute();
  });

  return subscriptionData.execute(result);
}
