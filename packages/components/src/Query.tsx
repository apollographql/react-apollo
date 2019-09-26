import { OperationVariables, useQuery } from '@apollo/react-common';
import PropTypes from 'prop-types';

import { QueryComponentOptions } from './types';

export function Query<TData = any, TVariables = OperationVariables>(
  props: QueryComponentOptions<TData, TVariables>
) {
  const { children, query, ...options } = props;
  const result = useQuery(query, options);
  return children && result ? children(result) : null;
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
    returnPartialData: PropTypes.bool
  };
}
