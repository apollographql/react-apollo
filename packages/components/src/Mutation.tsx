import React, {
  Fragment,
  useContext,
  useState,
  useRef,
  useEffect
} from 'react';
import { getApolloContext } from '@apollo/react-common';

import { MutationCore } from './core/MutationCore';
import { OperationVariables, MutationProps } from './types';

export function Mutation<TData = any, TVariables = OperationVariables>(
  props: MutationProps<TData, TVariables>
) {
  const context = useContext(getApolloContext());
  const [result, setResult] = useState({ called: false, loading: false });
  const mutationCoreRef = useRef(
    new MutationCore<TData, TVariables>({
      props,
      result,
      setResult
    })
  );

  useEffect(() => {
    mutationCoreRef.current.isMounted = true;

    return function cleanup() {
      mutationCoreRef.current.isMounted = false;
    };
  });

  const { children } = props;
  return (
    <Fragment>
      {children(
        options => mutationCoreRef.current.runMutation(props, context, options),
        result
      )}
    </Fragment>
  );
}
