import { ApolloClient } from 'apollo-client';
import { isEqual } from 'apollo-utilities';
import { invariant } from 'ts-invariant';
import {
  ApolloContextValue,
  parser,
  DocumentType,
  operationName
} from '@apollo/react-common';
import { DocumentNode } from 'graphql';

import { CommonOptions } from '../types';

export abstract class OperationData<TOptions = any> {
  private _isMounted: boolean = true;
  private _options: CommonOptions<TOptions> = {} as CommonOptions<TOptions>;
  private _previousOptions: CommonOptions<TOptions> = {} as CommonOptions<
    TOptions
  >;
  private _context: ApolloContextValue = {};
  private _client: ApolloClient<object> | undefined;

  constructor(options?: CommonOptions<TOptions>, context?: ApolloContextValue) {
    this._options = options || ({} as CommonOptions<TOptions>);
    this._context = context || {};
  }

  get isMounted(): boolean {
    return this._isMounted;
  }

  set isMounted(mounted: boolean) {
    this._isMounted = mounted;
  }

  get options(): CommonOptions<TOptions> {
    return this._options;
  }

  set options(newOptions: CommonOptions<TOptions>) {
    if (!isEqual(this.options, newOptions)) {
      this.previousOptions = this.options;
    }
    this._options = newOptions;
  }

  get previousOptions(): CommonOptions<TOptions> {
    return this._previousOptions;
  }

  set previousOptions(newOptions: CommonOptions<TOptions>) {
    this._previousOptions = newOptions;
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

  public abstract execute(...args: any): any;
  public abstract afterExecute(...args: any): () => void;

  protected abstract cleanup(): void;

  protected unmount() {
    this.isMounted = false;
  }

  protected refreshClient() {
    const client =
      (this.options && this.options.client) ||
      (this.context && this.context.client);

    invariant(
      !!client,
      'Could not find "client" in the context or passed in as an option. ' +
        'Wrap the root component in an <ApolloProvider>, or pass an ' +
        'ApolloClient instance in via options.'
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

  protected verifyDocumentType(document: DocumentNode, type: DocumentType) {
    const operation = parser(document);
    const requiredOperationName = operationName(type);
    const usedOperationName = operationName(operation.type);
    invariant(
      operation.type === type,
      `Running a ${requiredOperationName} requires a graphql ` +
        `${requiredOperationName}, but a ${usedOperationName} was used instead.`
    );
  }
}
