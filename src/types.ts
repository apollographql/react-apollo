import { ComponentClass, StatelessComponent } from 'react';

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
import { PureQueryOptions } from 'apollo-client/core/types';
import { MutationUpdaterFn } from 'apollo-client/core/watchQueryOptions';

import { ExecutionResult, DocumentNode } from 'graphql';

export interface MutationOpts {
  variables?: Object;
  optimisticResponse?: Object;
  updateQueries?: MutationQueryReducersMap;
  refetchQueries?: string[] | PureQueryOptions[];
  update?: MutationUpdaterFn;
  client?: ApolloClient;
  notifyOnNetworkStatusChange?: boolean;
}

export interface QueryOpts {
  ssr?: boolean;
  variables?: { [key: string]: any };
  fetchPolicy?: FetchPolicy;
  pollInterval?: number;
  client?: ApolloClient;
  // deprecated
  skip?: boolean;
  notifyOnNetworkStatusChange?: boolean;
}

export interface QueryProps {
  error?: ApolloError;
  networkStatus: number;
  loading: boolean;
  variables: {
    [variable: string]: any;
  };
  fetchMore: (
    fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions,
  ) => Promise<ApolloQueryResult<any>>;
  refetch: (variables?: any) => Promise<ApolloQueryResult<any>>;
  startPolling: (pollInterval: number) => void;
  stopPolling: () => void;
  subscribeToMore: (options: SubscribeToMoreOptions) => () => void;
  updateQuery: (
    mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any,
  ) => void;
}

export type MutationFunc<TResult> = (
  opts: MutationOpts,
) => Promise<ApolloQueryResult<TResult>>;

export interface OptionProps<TProps, TResult> {
  ownProps: TProps;
  data?: QueryProps & TResult;
  mutate?: MutationFunc<TResult>;
}

export type ChildProps<P, R> = P & {
  data?: QueryProps & R;
  mutate?: MutationFunc<R>;
};

export type NamedProps<P, R> = P & {
  ownProps: R;
};

export interface OperationOption<TProps, TResult> {
  options?:
    | QueryOpts
    | MutationOpts
    | ((props: TProps) => QueryOpts | MutationOpts);
  props?: (props: OptionProps<TProps, TResult>) => any;
  skip?: boolean | ((props: any) => boolean);
  name?: string;
  withRef?: boolean;
  shouldResubscribe?: (props: TProps, nextProps: TProps) => boolean;
  alias?: string;
}

export type CompositeComponent<P> = ComponentClass<P> | StatelessComponent<P>;

export interface ComponentDecorator<TOwnProps, TMergedProps> {
  (component: CompositeComponent<TMergedProps>): ComponentClass<TOwnProps>;
}
export interface InferableComponentDecorator<TOwnProps> {
  <T extends CompositeComponent<TOwnProps>>(component: T): T;
}
