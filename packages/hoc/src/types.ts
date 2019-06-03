import {
  ApolloQueryResult,
  ApolloError,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  SubscribeToMoreOptions
} from 'apollo-client';
import {
  OperationVariables,
  MutationFunction,
  BaseQueryOptions,
  BaseMutationOptions,
  MutationResult
} from '@apollo/react-common';

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

export interface DataProps<TData, TGraphQLVariables = OperationVariables> {
  data: DataValue<TData, TGraphQLVariables>;
}

export interface MutateProps<
  TData = any,
  TGraphQLVariables = OperationVariables
> {
  mutate: MutationFunction<TData, TGraphQLVariables>;
  result: MutationResult<TData>;
}

export type ChildProps<
  TProps = {},
  TData = {},
  TGraphQLVariables = OperationVariables
> = TProps &
  Partial<DataProps<TData, TGraphQLVariables>> &
  Partial<MutateProps<TData, TGraphQLVariables>>;

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
    | BaseQueryOptions<TGraphQLVariables>
    | BaseMutationOptions<TData, TGraphQLVariables>
    | ((
        props: TProps
      ) =>
        | BaseQueryOptions<TGraphQLVariables>
        | BaseMutationOptions<TData, TGraphQLVariables>
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
