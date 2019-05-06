import React, {
  Fragment,
  useReducer,
  useRef,
  useEffect,
  useContext
} from 'react';
import { getApolloContext } from '@apollo/react-common';

import { QueryProps, OperationVariables } from './types';
import { QueryCore } from './core/QueryCore';

export function Query<TData = any, TVariables = OperationVariables>(
  props: QueryProps<TData, TVariables>
) {
  const context = useContext(getApolloContext());
  const [_ignored, forceUpdate] = useReducer(x => x + 1, 0);
  const queryCoreRef = useRef(
    new QueryCore<any, any>({
      forceUpdate
    })
  );

  const prevProps = usePreviousProps<TData, TVariables>(props);

  useEffect(() => {
    queryCoreRef.current.isMounted = true;
    queryCoreRef.current.afterRender(props, prevProps);

    return function cleanup() {
      queryCoreRef.current.isMounted = false;
      // queryCoreRef.current.cleanup();
    };
  });

  return <Fragment>{queryCoreRef.current.render(props, context)}</Fragment>;
}

function usePreviousProps<TData = any, TVariables = OperationVariables>(
  prevProps: QueryProps<TData, TVariables>
) {
  const prevPropsRef = useRef<QueryProps<TData, TVariables>>();
  useEffect(() => {
    prevPropsRef.current = prevProps;
  });
  return prevPropsRef.current;
}
