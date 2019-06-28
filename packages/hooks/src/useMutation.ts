import { useContext, useState, useRef, useEffect } from 'react';
import { getApolloContext, OperationVariables } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { invariant } from 'ts-invariant';

import { MutationHookOptions, MutationTuple } from './types';
import { MutationData } from './data/MutationData';

let showApiChangeWarning = true;

export function useMutation<TData = any, TVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: MutationHookOptions<TData, TVariables>
): MutationTuple<TData, TVariables> {
  // This is a temporary message intended to help lessen the blow of a
  // breaking `useMutation` API change during the RA 3 beta process. It will
  // be removed before the official launch of RA 3.
  if (showApiChangeWarning) {
    invariant.warn(
      'PLEASE NOTE: The `useMutation` API has changed; the tuple based ' +
        'return value now has the mutation result in the first position, ' +
        'e.g. [Mutation Result, Mutation Function]. See ' +
        'https://github.com/apollographql/react-apollo/issues/3189 for the ' +
        'reason behind this change.'
    );
    showApiChangeWarning = false;
  }

  const context = useContext(getApolloContext());
  const [result, setResult] = useState({ called: false, loading: false });
  const updatedOptions = options ? { ...options, mutation } : { mutation };

  const mutationDataRef = useRef<MutationData<TData, TVariables>>();
  function getMutationDataRef() {
    if (!mutationDataRef.current) {
      mutationDataRef.current = new MutationData<TData, TVariables>({
        options: updatedOptions,
        context,
        result,
        setResult
      });
    }
    return mutationDataRef.current;
  }

  const mutationData = getMutationDataRef();
  mutationData.setOptions(updatedOptions);
  mutationData.context = context;

  useEffect(() => mutationData.afterExecute());

  return mutationData.execute(result);
}
