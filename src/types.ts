import ApolloClient, {
  MutationQueryReducersMap,
  ApolloQueryResult,
  ApolloError,
  FetchPolicy,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  SubscribeToMoreOptions,
  PureQueryOptions,
  MutationUpdaterFn,
} from 'apollo-client';
// import { PureQueryOptions } from 'apollo-client/core/types';
// import { MutationUpdaterFn } from 'apollo-client/core/watchQueryOptions';

export type OperationVariables = {
  [key: string]: any;
};

export interface MutationOpts<TVariables = OperationVariables> {
  variables?: TVariables;
  optimisticResponse?: Object;
  updateQueries?: MutationQueryReducersMap;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
}

export interface QueryOpts<TVariables = OperationVariables> {
  ssr?: boolean;
  variables?: TVariables;
  fetchPolicy?: FetchPolicy;
  pollInterval?: number;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
  // deprecated
  skip?: boolean;
}

export interface QueryProps<TVariables = OperationVariables> {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: TVariables;
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions,
  ) => Promise<ApolloQueryResult<any>>;
  refetch: (variables?: TVariables) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  subscribeToMore: (options: SubscribeToMoreOptions) => () => void;
  updateQuery: (
    mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any,
  ) => void;
}

export type MutationFunc<TResult, TVariables = OperationVariables> = (
  opts: MutationOpts<TVariables>,
) => Promise<ApolloQueryResult<TResult>>;

export interface OptionProps<
  TProps = any,
  TResult = any,
  TVariables = OperationVariables
> {
  ownProps: TProps;
  data?: QueryProps<TVariables> & TResult;
  mutate?: MutationFunc<TResult, TVariables>;
}

export type ChildProps<
  TProps,
  TResult,
  TVariables = OperationVariables
> = TProps & {
  data?: QueryProps<TVariables> & Partial<TResult>;
  mutate?: MutationFunc<TResult, TVariables>;
};

export type NamedProps<TProps, R> = TProps & {
  ownProps: R;
};

export interface OperationOption<
  TProps,
  TResult,
  TVariables = OperationVariables
> {
  options?:
    | QueryOpts<TVariables>
    | MutationOpts<TVariables>
    | ((props: TProps) => QueryOpts<TVariables> | MutationOpts<TVariables>);
  props?: (props: OptionProps<TProps, TResult>) => any;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (props: TProps, nextProps: TProps) => boolean;
  alias?: string;
}
