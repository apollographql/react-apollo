import { ApolloClient } from 'apollo-client';
import { ApolloContextValue } from '@apollo/react-common';
import { invariant } from 'ts-invariant';

import { CommonProps } from '../types';

export abstract class OperationCore<TProps = any> {
  private _isMounted: boolean = true;
  private _props: CommonProps<TProps> = {} as CommonProps<TProps>;
  private _context: ApolloContextValue = {};
  private _client: ApolloClient<object> | undefined;

  constructor(props?: CommonProps<TProps>, context?: ApolloContextValue) {
    this._props = props || ({} as CommonProps<TProps>);
    this._context = context || {};
  }

  get isMounted(): boolean {
    return this._isMounted;
  }

  set isMounted(mounted: boolean) {
    this._isMounted = mounted;
  }

  get props(): CommonProps<TProps> {
    return this._props;
  }

  set props(newProps: CommonProps<TProps>) {
    this._props = newProps;
  }

  get context(): ApolloContextValue {
    return this._context;
  }

  set context(newContext: ApolloContextValue) {
    this._context = newContext;
  }

  get client(): ApolloClient<object> | undefined {
    return this._client;
  }

  set client(newClient: ApolloClient<object> | undefined) {
    this._client = newClient;
  }

  public abstract render(...args: any[]): any;
  public abstract afterRender(...args: any[]): () => void;

  protected abstract cleanup(): void;

  protected unmount() {
    this.isMounted = false;
  }

  protected refreshClient(
    props?: CommonProps<TProps>,
    context?: ApolloContextValue
  ) {
    const client =
      (props && props.client) ||
      this.props.client ||
      (context && context.client) ||
      this.context.client;

    invariant(
      !!client,
      'Could not find "client" in the context or passed in as a prop. ' +
        'Wrap the root component in an <ApolloProvider>, or pass an ' +
        'ApolloClient instance in via props.'
    );

    let isNew = false;
    if (client !== this.client) {
      isNew = true;
      this.client = client;
      this.cleanup();
    }
    return {
      client: this.client as ApolloClient<object>,
      isNew
    };
  }
}
