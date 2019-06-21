import { OperationVariables } from '@apollo/react-common';
import { useQuery } from '@apollo/react-hooks';
import PropTypes from 'prop-types';

import { QueryComponentOptions } from './types';

export function Query<TData = any, TVariables = OperationVariables>(
  props: QueryComponentOptions<TData, TVariables>
) {
  const result = useQuery(props.query, props);
  return props.children && result ? props.children(result) : null;
}

export namespace Query {
  export const propTypes = {
    client: PropTypes.object,
    children: PropTypes.func.isRequired,
    fetchPolicy: PropTypes.string,
    notifyOnNetworkStatusChange: PropTypes.bool,
    onCompleted: PropTypes.func,
    onError: PropTypes.func,
    pollInterval: PropTypes.number,
    query: PropTypes.object.isRequired,
    variables: PropTypes.object,
    ssr: PropTypes.bool,
    partialRefetch: PropTypes.bool,
    returnPartialData: PropTypes.bool,
  };
}
