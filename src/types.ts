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

export interface MutationOpts<TGraphQLVariables = OperationVariables> {
  variables?: TGraphQLVariables;
  optimisticResponse?: Object;
  updateQueries?: MutationQueryReducersMap;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
}

export interface QueryOpts<TGraphQLVariables = OperationVariables> {
  ssr?: boolean;
  variables?: TGraphQLVariables;
  fetchPolicy?: FetchPolicy;
  pollInterval?: number;
  client?: ApolloClient<any>;
  notifyOnNetworkStatusChange?: boolean;
}

export interface QueryProps<TGraphQLVariables = OperationVariables> {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: TGraphQLVariables;
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions,
  ) => Promise<ApolloQueryResult<any>>;
  refetch: (variables?: TGraphQLVariables) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  subscribeToMore: (options: SubscribeToMoreOptions) => () => void;
  updateQuery: (
    mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any,
  ) => void;
}

export type MutationFunc<
  TData = any,
  TGraphQLVariables = OperationVariables
> = (
  opts: MutationOpts<TGraphQLVariables>,
) => Promise<ApolloQueryResult<TData>>;

export type DataValue<
  TData,
  TGraphQLVariables = OperationVariables
> = QueryProps<TGraphQLVariables> &
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
  mutate: MutationFunc<TData, TGraphQLVariables>;
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
  TGraphQLVariables = OperationVariables
> {
  options?:
    | QueryOpts<TGraphQLVariables>
    | MutationOpts<TGraphQLVariables>
    | ((
        props: TProps,
      ) => QueryOpts<TGraphQLVariables> | MutationOpts<TGraphQLVariables>);
  props?: (props: OptionProps<TProps, TData>) => any;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (
    props: TProps & DataProps<TData, TGraphQLVariables>,
    nextProps: TProps & DataProps<TData, TGraphQLVariables>,
  ) => boolean;
  alias?: string;
}
