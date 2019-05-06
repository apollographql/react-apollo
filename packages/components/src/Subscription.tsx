import { useContext, useState, useRef, useEffect } from 'react';
import { getApolloContext } from '@apollo/react-common';

import { OperationVariables, SubscriptionProps } from './types';
import { SubscriptionCore } from './core/SubscriptionCore';

export function Subscription<TData = any, TVariables = OperationVariables>(
  props: SubscriptionProps<TData, TVariables>
) {
  const context = useContext(getApolloContext());
  const [result, setResult] = useState({
    loading: true,
    error: undefined,
    data: undefined
  });
  const subscriptionCoreRef = useRef(
    new SubscriptionCore<TData, TVariables>(props, context, setResult)
  );
  const subscriptionCore = subscriptionCoreRef.current;

  subscriptionCore.props = props;
  subscriptionCore.context = context;

  useEffect(() => {
    return subscriptionCore.afterRender();
  });

  return subscriptionCore.render(result);
}
