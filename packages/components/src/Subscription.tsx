import { OperationVariables, SubscriptionOptions } from '@apollo/react-common';
import { useSubscription } from '@apollo/react-hooks';
import PropTypes from 'prop-types';

export function Subscription<TData = any, TVariables = OperationVariables>(
  props: SubscriptionOptions<TData, TVariables>
) {
  const result = useSubscription(props.subscription, props);
  return props.children && result ? props.children(result) : null;
}

Subscription.propTypes = {
  subscription: PropTypes.object.isRequired,
  variables: PropTypes.object,
  children: PropTypes.func,
  onSubscriptionData: PropTypes.func,
  onSubscriptionComplete: PropTypes.func,
  shouldResubscribe: PropTypes.oneOfType([PropTypes.func, PropTypes.bool])
};
