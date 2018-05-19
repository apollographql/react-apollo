import * as React from 'react';
import * as PropTypes from 'prop-types';
const invariant = require('invariant');

import ApolloClient, { ApolloError, ApolloQueryResult } from 'apollo-client';
import { DocumentNode, GraphQLError } from 'graphql';
import { OperationVariables } from './types';

export declare type LoadOptions<TVariables = OperationVariables> = {
  variables?: TVariables;
};

export interface QueryResult<TData = any> {
  data?: TData;
  error?: ApolloError;
  loading: boolean;
  called: boolean;
}

export interface Props<TData = any, TVariables = OperationVariables> {
  query: DocumentNode;
  variables?: TVariables;
  children: (
    loadFn: (options?: LoadOptions<TVariables>) => Promise<void | TData>,
    result: QueryResult<TData>,
  ) => React.ReactNode;
}

export declare type State<TData = any> = {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
  called: boolean;
};

const initialState = {
  loading: false,
  data: undefined,
  called: false,
  error: undefined,
};

export default class ManualQuery<
  TData = any,
  TVariables = OperationVariables
> extends React.Component<Props<TData, TVariables>, State<TData>> {
  private client: ApolloClient<any>;

  static contextTypes = {
    client: PropTypes.object.isRequired,
  };

  constructor(props: Props<TData, TVariables>, context: any) {
    super(props, context);

    this.state = initialState;

    this.client = this.retrieveClientFromContext(context);
  }

  render() {
    const { loading, data, error, called } = this.state;

    const result = {
      called,
      loading,
      data,
      error,
    };

    return this.props.children(this.runQuery, this.state);
  }

  private runQuery = (options: LoadOptions<TVariables> = {}): Promise<void | TData> => {
    this.onStartQuery();
    const { query, variables } = this.props;

    return this.query(options)
      .then(this.onCompleteQuery)
      .catch(this.onErrorQuery);
  };

  private onStartQuery = () => {
    this.setState({
      loading: true,
      called: true,
      error: undefined,
      data: undefined,
    });
  };

  private onCompleteQuery = (result: ApolloQueryResult<TData>) => {
    const { data } = result;
    this.setState({
      loading: false,
      data,
    });

    return data;
  };

  private onErrorQuery = (error: ApolloError) => {
    this.setState({
      loading: false,
      error,
    });
  };

  private query = (options: LoadOptions<TVariables>): Promise<ApolloQueryResult<TData>> => {
    const { query, variables } = this.props;

    return this.client.query({
      query,
      variables,
      ...options,
    });
  };

  private retrieveClientFromContext = (context: any): ApolloClient<any> => {
    invariant(
      !!context.client,
      `Could not find "client" in the context of ManualQuery. Wrap the root component in an <ApolloProvider>`,
    );

    return context.client;
  };
}
