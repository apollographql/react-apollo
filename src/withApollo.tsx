import * as React from 'react';

const invariant = require('invariant');

const hoistNonReactStatics = require('hoist-non-react-statics');

import { OperationOption } from './types';
import ApolloConsumer from './ApolloConsumer';

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function withApollo<TProps, TResult>(
  WrappedComponent,
  operationOptions: OperationOption<TProps, TResult> = {},
) {
  const withDisplayName = `withApollo(${getDisplayName(WrappedComponent)})`;

  class WithApollo extends React.Component<any, any> {
    static displayName = withDisplayName;
    static WrappedComponent = WrappedComponent;

    // wrapped instance
    private wrappedInstance: any;

    constructor(props) {
      super(props);
      this.setWrappedInstance = this.setWrappedInstance.bind(this);
    }

    getWrappedInstance() {
      invariant(
        operationOptions.withRef,
        `To access the wrapped instance, you need to specify ` +
          `{ withRef: true } in the options`,
      );

      return this.wrappedInstance;
    }

    setWrappedInstance(ref) {
      this.wrappedInstance = ref;
    }

    render() {
      return (
        <ApolloConsumer>
          {client => (
            <WrappedComponent
              {...this.props}
              client={client}
              ref={
                operationOptions.withRef ? this.setWrappedInstance : undefined
              }
            />
          )}
        </ApolloConsumer>
      );
    }
  }

  // Make sure we preserve any custom statics on the original component.
  return hoistNonReactStatics(WithApollo, WrappedComponent, {});
}
