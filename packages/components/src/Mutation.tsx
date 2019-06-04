import { OperationVariables } from '@apollo/react-common';
import { useMutation } from '@apollo/react-hooks';
import PropTypes from 'prop-types';

import { MutationComponentOptions } from './types';

export function Mutation<TData = any, TVariables = OperationVariables>(
  props: MutationComponentOptions<TData, TVariables>
) {
  const [runMutation, result] = useMutation(props.mutation, props);
  return props.children ? props.children(runMutation, result) : null;
}

export namespace Mutation {
  export const propTypes = {
    mutation: PropTypes.object.isRequired,
    variables: PropTypes.object,
    optimisticResponse: PropTypes.object,
    refetchQueries: PropTypes.oneOfType([
      PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.object])
      ),
      PropTypes.func
    ]),
    awaitRefetchQueries: PropTypes.bool,
    update: PropTypes.func,
    children: PropTypes.func.isRequired,
    onCompleted: PropTypes.func,
    onError: PropTypes.func,
    fetchPolicy: PropTypes.string,
  };
}
