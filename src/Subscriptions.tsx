import * as React from 'react';
import * as PropTypes from 'prop-types';
import ApolloClient, {
  ObservableQuery,
  ApolloQueryResult,
  ApolloError,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  FetchPolicy,
  ApolloCurrentResult,
} from 'apollo-client';
import { DocumentNode } from 'graphql';
import { ZenObservable } from 'zen-observable-ts';
import { OperationVariables } from './types';
import { parser, DocumentType } from './parser';

const shallowEqual = require('fbjs/lib/shallowEqual');
const invariant = require('invariant');

export interface SubscriptionProps {
  subscription: DocumentNode;
  variables?: OperationVariables;
}

export interface SubscriptionState {
  result: any;
}

class Subscription extends React.Component {
  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  state: SubscriptionState;

  private client: ApolloClient<any>;
  private querySubscription: ZenObservable.Subscription;

  constructor(props: SubscriptionProps, context: any) {
    super(props, context);

    invariant(
      !!context.client,
      `Could not find "client" in the context of Subscription. Wrap the root component in an <ApolloProvider>`,
    );
    this.client = context.client;

    this.initialize(props);

    this.state = {
      result: {
        loading: true,
        error: undefined,
        variables: props.variables,
        data: {},
      },
    };
  }

  componentDidMount() {
    this.startSubscription();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (
      shallowEqual(this.props, nextProps) &&
      this.client === nextContext.client
    ) {
      return;
    }

    if (this.client !== nextContext.client) {
      this.client = nextContext.client;
    }

    this.endSubscription();
    this.initialize(nextProps);
    this.startSubscription();
    this.setState(this.getInitialState(nextProps));
  }

  componentWillUnmount() {
    this.endSubscription();
  }

  render() {
    return this.props.children(this.state.result);
  }

  private initialize = props => {
    this.queryObservable = this.client.subscribe({
      query: props.subscription,
      variables: props.variables,
    });
  };

  private startSubscription = () => {
    this.querySubscription = this.queryObservable.subscribe({
      next: this.updateCurrentData,
      error: this.updateError,
    });
  };

  private getInitialState = props => {
    return {
      result: {
        loading: true,
        error: undefined,
        variables: props.variables,
        data: {},
      },
    };
  };

  private updateCurrentData = result => {
    this.setState({ result, loading: false });
  };

  private updateError = error => {
    this.setState({
      result: {
        error,
        loading: false,
      },
    });
  };

  private endSubscription = () => {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
    }
  };
}

export default Subscription;
