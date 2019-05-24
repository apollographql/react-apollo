import { useContext, useState, useRef, useEffect } from 'react';
import {
  getApolloContext,
  OperationVariables,
  MutationFunctionOptions
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { MutationHookOptions, MutationHookResult } from './types';
import { MutationData } from './data/MutationData';

export function useMutation<TData = any, TVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: MutationHookOptions<TData, TVariables>
): MutationHookResult<TData, TVariables> {
  const context = useContext(getApolloContext());
  const [result, setResult] = useState({ called: false, loading: false });
  const updatedOptions = options ? { ...options, mutation } : { mutation };
  const mutationDataRef = useRef(
    new MutationData<TData, TVariables>({
      options: updatedOptions,
      context,
      result,
      setResult
    })
  );
  const mutationData = mutationDataRef.current;
  mutationData.options = updatedOptions;
  mutationData.context = context;

  useEffect(() => {
    return mutationData.afterExecute();
  });

  return [
    (options?: MutationFunctionOptions<TData, TVariables>) =>
      mutationData.execute(options),
    result
  ];
}
