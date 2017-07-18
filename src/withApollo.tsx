import {
  Component,
  createElement,
  ComponentClass,
  StatelessComponent,
} from 'react';
import * as PropTypes from 'prop-types';

const invariant = require('invariant');
const assign = require('object-assign');

const hoistNonReactStatics = require('hoist-non-react-statics');

import ApolloClient, {
  ObservableQuery,
  MutationQueryReducersMap,
  Subscription,
  ApolloStore,
  ApolloQueryResult,
  ApolloError,
  FetchPolicy,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  SubscribeToMoreOptions,
} from 'apollo-client';

import {
  // GraphQLResult,
  DocumentNode,
} from 'graphql';

import { parser, DocumentType } from './parser';
import { OperationOption } from './types';

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function withApollo<TProps, TResult>(
  WrappedComponent,
  operationOptions: OperationOption<TProps, TResult> = {},
) {
  const withDisplayName = `withApollo(${getDisplayName(WrappedComponent)})`;

  class WithApollo extends Component<any, any> {
    static displayName = withDisplayName;
    static WrappedComponent = WrappedComponent;
    static contextTypes = { client: PropTypes.object.isRequired };

    // data storage
    private client: ApolloClient; // apollo client

    constructor(props, context) {
      super(props, context);
      this.client = context.client;

      invariant(
        !!this.client,
        `Could not find "client" in the context of ` +
          `"${withDisplayName}". ` +
          `Wrap the root component in an <ApolloProvider>`,
      );
    }

    getWrappedInstance() {
      invariant(
        operationOptions.withRef,
        `To access the wrapped instance, you need to specify ` +
          `{ withRef: true } in the options`,
      );

      return (this.refs as any).wrappedInstance;
    }

    render() {
      const props = assign({}, this.props);
      props.client = this.client;
      if (operationOptions.withRef) props.ref = 'wrappedInstance';
      return createElement(WrappedComponent, props);
    }
  }

  // Make sure we preserve any custom statics on the original component.
  return hoistNonReactStatics(WithApollo, WrappedComponent, {});
}
