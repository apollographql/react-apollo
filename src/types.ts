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
} from 'apollo-client';

export type OperationVariables = {
  [key: string]: any;
};

/**
 * Function which returns an array of query names or query objects for refetchQueries option.
 * Allows conditional refetches.
 */
export type RefetchQueriesProviderFn = (...args: any[]) => Array<string | PureQueryOptions>;

export interface MutationOpts<TData = any, TGraphQLVariables = OperationVariables> {
  variables?: TGraphQLVariables;
  optimisticResponse?: TData;
  refetchQueries?: Array<string | PureQueryOptions> | RefetchQueriesProviderFn;
  errorPolicy?: ErrorPolicy;
  update?: MutationUpdaterFn;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
  context?: Record<string, any>;
}

export interface QueryOpts<TGraphQLVariables = OperationVariables> {
  ssr?: boolean;
  variables?: TGraphQLVariables;
  fetchPolicy?: FetchPolicy;
  errorPolicy?: ErrorPolicy;
  pollInterval?: number;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
  context?: Record<string, any>;
}

export interface GraphqlQueryControls<TGraphQLVariables = OperationVariables> {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: TGraphQLVariables;
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions<any, any> & FetchMoreOptions,
  ) => Promise<ApolloQueryResult<any>>;
  refetch: (variables?: TGraphQLVariables) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  subscribeToMore: (options: SubscribeToMoreOptions) => () => void;
  updateQuery: (mapFn: (previousQueryResult: any, options: UpdateQueryOptions<any>) => any) => void;
}

export type MutationFunc<TData = any, TGraphQLVariables = OperationVariables> = (
  opts?: MutationOpts<TData, TGraphQLVariables>,
) => Promise<ApolloQueryResult<TData>>;

export type DataValue<TData, TGraphQLVariables = OperationVariables> = GraphqlQueryControls<
  TGraphQLVariables
> &
  // data may not yet be loaded
  Partial<TData>;

// export to allow usage individually for simple components
export interface DataProps<TData, TGraphQLVariables = OperationVariables> {
  data: DataValue<TData, TGraphQLVariables>;
}

// export to allow usage individually for simple components
export interface MutateProps<TData = any, TGraphQLVariables = OperationVariables> {
  mutate: MutationFunc<TData, TGraphQLVariables>;
}

export type ChildProps<TProps = {}, TData = {}, TGraphQLVariables = OperationVariables> = TProps &
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

export interface OptionProps<TProps = any, TData = any, TGraphQLVariables = OperationVariables>
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
    | ((props: TProps) => QueryOpts<TGraphQLVariables> | MutationOpts<TData, TGraphQLVariables>);
  props?: (
    props: OptionProps<TProps, TData, TGraphQLVariables>,
    lastProps?: TChildProps | void,
  ) => TChildProps;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (props: TProps, nextProps: TProps) => boolean;
  alias?: string;
}
