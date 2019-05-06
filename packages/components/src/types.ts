import ApolloClient, {
  ApolloQueryResult,
  ApolloError,
  FetchPolicy,
  ErrorPolicy,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  SubscribeToMoreOptions,
  PureQueryOptions,
  MutationUpdaterFn,
  NetworkStatus,
  ObservableQuery
} from 'apollo-client';
import { DataProxy } from 'apollo-cache';
import { DocumentNode, GraphQLError } from 'graphql';
import { ApolloContextValue } from '@apollo/react-common';

export interface Context {
  [key: string]: any;
}

export type OperationVariables = {
  [key: string]: any;
};

/**
 * Function which returns an array of query names or query objects for refetchQueries option.
 * Allows conditional refetches.
 */
export type RefetchQueriesProviderFn = (
  ...args: any[]
) => Array<string | PureQueryOptions>;

export interface MutationOpts<
  TData = any,
  TGraphQLVariables = OperationVariables
> {
  variables?: TGraphQLVariables;
  optimisticResponse?: TData;
  refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
  awaitRefetchQueries?: boolean;
  errorPolicy?: ErrorPolicy;
  update?: MutationUpdaterFn<TData>;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
  context?: Context;
  onCompleted?: (data: TData) => void;
  onError?: (error: ApolloError) => void;
  fetchPolicy?: FetchPolicy;
}

export interface QueryOpts<TGraphQLVariables = OperationVariables> {
  ssr?: boolean;
  variables?: TGraphQLVariables;
  fetchPolicy?: FetchPolicy;
  errorPolicy?: ErrorPolicy;
  pollInterval?: number;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
  context?: Context;
  partialRefetch?: boolean;
}

export interface QueryControls<
  TData = any,
  TGraphQLVariables = OperationVariables
> {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: TGraphQLVariables;
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions<TGraphQLVariables, any> &
      FetchMoreOptions<TData, TGraphQLVariables>
  ) => Promise<ApolloQueryResult<TData>>;
  refetch: (variables?: TGraphQLVariables) => Promise<ApolloQueryResult<TData>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  subscribeToMore: (options: SubscribeToMoreOptions) => () => void;
  updateQuery: (
    mapFn: (previousQueryResult: any, options: UpdateQueryOptions<any>) => any
  ) => void;
}

export type DataValue<
  TData,
  TGraphQLVariables = OperationVariables
> = QueryControls<TData, TGraphQLVariables> &
  // data may not yet be loaded
  Partial<TData>;

// export to allow usage individually for simple components
export interface DataProps<TData, TGraphQLVariables = OperationVariables> {
  data: DataValue<TData, TGraphQLVariables>;
}

// export to allow usage individually for simple components
export interface MutateProps<
  TData = any,
  TGraphQLVariables = OperationVariables
> {
  mutate: MutationFn<TData, TGraphQLVariables>;
}

export type ChildProps<
  TProps = {},
  TData = {},
  TGraphQLVariables = OperationVariables
> = TProps &
  Partial<DataProps<TData, TGraphQLVariables>> &
  Partial<MutateProps<TData, TGraphQLVariables>>;

export type ChildDataProps<
  TProps = {},
  TData = {},
  TGraphQLVariables = OperationVariables
> = TProps & DataProps<TData, TGraphQLVariables>;

export type ChildMutateProps<
  TProps = {},
  TData = {},
  TGraphQLVariables = OperationVariables
> = TProps & MutateProps<TData, TGraphQLVariables>;

export type NamedProps<TProps, R> = TProps & {
  ownProps: R;
};

export interface OptionProps<
  TProps = any,
  TData = any,
  TGraphQLVariables = OperationVariables
>
  extends Partial<DataProps<TData, TGraphQLVariables>>,
    Partial<MutateProps<TData, TGraphQLVariables>> {
  ownProps: TProps;
}

export interface OperationOption<
  TProps,
  TData,
  TGraphQLVariables = OperationVariables,
  TChildProps = ChildProps<TProps, TData, TGraphQLVariables>
> {
  options?:
    | QueryOpts<TGraphQLVariables>
    | MutationOpts<TData, TGraphQLVariables>
    | ((
        props: TProps
      ) =>
        | QueryOpts<TGraphQLVariables>
        | MutationOpts<TData, TGraphQLVariables>
      );
  props?: (
    props: OptionProps<TProps, TData, TGraphQLVariables>,
    lastProps?: TChildProps | void
  ) => TChildProps;
  skip?: boolean | ((props: TProps) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (props: TProps, nextProps: TProps) => boolean;
  alias?: string;
}

export type ObservableQueryFields<TData, TVariables> = Pick<
  ObservableQuery<TData, TVariables>,
  | 'startPolling'
  | 'stopPolling'
  | 'subscribeToMore'
  | 'updateQuery'
  | 'refetch'
  | 'variables'
> & {
  fetchMore: (<K extends keyof TVariables>(
    fetchMoreOptions: FetchMoreQueryOptions<TVariables, K> &
      FetchMoreOptions<TData, TVariables>
  ) => Promise<ApolloQueryResult<TData>>) &
    (<TData2, TVariables2, K extends keyof TVariables2>(
      fetchMoreOptions: { query: DocumentNode } & FetchMoreQueryOptions<
        TVariables2,
        K
      > &
        FetchMoreOptions<TData2, TVariables2>
    ) => Promise<ApolloQueryResult<TData2>>);
};

export interface QueryResult<TData = any, TVariables = OperationVariables>
  extends ObservableQueryFields<TData, TVariables> {
  client: ApolloClient<any>;
  data: TData | undefined;
  error?: ApolloError;
  loading: boolean;
  networkStatus: NetworkStatus;
}

export interface QueryProps<TData = any, TVariables = OperationVariables>
  extends QueryOpts<TVariables> {
  children: (result: QueryResult<TData, TVariables>) => React.ReactNode;
  query: DocumentNode;
  displayName?: string;
  skip?: boolean;
  onCompleted?: (data: TData) => void;
  onError?: (error: ApolloError) => void;
}

export interface MutationResult<TData = Record<string, any>> {
  data?: TData;
  error?: ApolloError;
  loading: boolean;
  called: boolean;
  client?: ApolloClient<Object>;
}

export interface ExecutionResult<T = Record<string, any>> {
  data?: T;
  extensions?: Record<string, any>;
  errors?: GraphQLError[];
}

export declare type MutationUpdaterFn<
  T = {
    [key: string]: any;
  }
> = (proxy: DataProxy, mutationResult: FetchResult<T>) => void;

export declare type FetchResult<
  TData = Record<string, any>,
  C = Record<string, any>,
  E = Record<string, any>
> = ExecutionResult<TData> & {
  extensions?: E;
  context?: C;
};

export declare type MutationOptions<
  TData = Record<string, any>,
  TVariables = OperationVariables
> = {
  variables?: TVariables;
  optimisticResponse?: TData;
  refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
  awaitRefetchQueries?: boolean;
  update?: MutationUpdaterFn<TData>;
  context?: Record<string, any>;
  fetchPolicy?: FetchPolicy;
};

// export declare type MutationFn<TData = any, TVariables = OperationVariables> = (
//   props?: MutationProps<TData, TVariables>,
//   context?: ApolloContextValue,
//   options?: MutationOptions<TData, TVariables>
// ) => Promise<void | FetchResult<TData>>;

export declare type MutationFn<TData = any, TVariables = OperationVariables> = (
  options?: MutationOptions<TData, TVariables>
) => Promise<void | FetchResult<TData>>;

export interface MutationProps<TData = any, TVariables = OperationVariables> {
  client?: ApolloClient<Object>;
  mutation: DocumentNode;
  ignoreResults?: boolean;
  optimisticResponse?: TData;
  variables?: TVariables;
  refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
  awaitRefetchQueries?: boolean;
  update?: MutationUpdaterFn<TData>;
  children: (
    mutateFn: MutationFn<TData, TVariables>,
    result: MutationResult<TData>
  ) => React.ReactNode;
  onCompleted?: (data: TData) => void;
  onError?: (error: ApolloError) => void;
  context?: Record<string, any>;
  fetchPolicy?: FetchPolicy;
}

export interface MutationState<TData = any> {
  called: boolean;
  loading: boolean;
  error?: ApolloError;
  data?: TData;
  client?: ApolloClient<TData>;
}

export interface SubscriptionResult<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

export interface OnSubscriptionDataOptions<TData = any> {
  client: ApolloClient<Object>;
  subscriptionData: SubscriptionResult<TData>;
}

export interface SubscriptionProps<
  TData = any,
  TVariables = OperationVariables
> {
  subscription: DocumentNode;
  variables?: TVariables;
  fetchPolicy?: FetchPolicy;
  shouldResubscribe?: any;
  client?: ApolloClient<Object>;
  onSubscriptionData?: (options: OnSubscriptionDataOptions<TData>) => any;
  onSubscriptionComplete?: () => void;
  children?: (result: SubscriptionResult<TData>) => React.ReactNode;
}

export interface SubscriptionState<TData = any> {
  loading: boolean;
  data?: TData;
  error?: ApolloError;
}

export interface QueryPreviousData<TData> {
  client?: ApolloClient<object>;
  query?: DocumentNode;
  options?: {};
  result?: ApolloQueryResult<TData> | null;
  loading?: boolean;
}

export interface QueryCurrentObservable<TData, TVariables> {
  query?: ObservableQuery<TData, TVariables> | null;
  subscription?: ZenObservable.Subscription;
}

export type CommonProps<TProps> = TProps & { client?: ApolloClient<object> };
