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
  const subCoreRef = useRef(
    new SubscriptionCore<TData, TVariables>(props, context, setResult)
  );

  subCoreRef.current.setProps(props);
  subCoreRef.current.setContext(context);

  useEffect(() => {
    subCoreRef.current.isMounted = true;

    return function cleanup() {
      subCoreRef.current.isMounted = false;
    };
  });

  return subCoreRef.current.render(result);
}
