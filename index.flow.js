import type {
  ApolloClient,
  MutationQueryReducersMap,
  ApolloQueryResult,
  ApolloError,
  FetchPolicy,
  FetchMoreOptions,
  UpdateQueryOptions,
  FetchMoreQueryOptions,
  SubscribeToMoreOptions,
} from "apollo-client";
import type { Store } from "redux";
import type { DocumentNode, VariableDefinitionNode } from "graphql";

declare module "react-apollo" {
  declare type StatelessComponent<P> = (props: P) => ?React$Element<any>;

  declare export interface ProviderProps {
    store?: Store<any>,
    client: ApolloClient,
  }

  declare export class ApolloProvider extends React$Component {
    props: ProviderProps,
    childContextTypes: {
      store: Store,
      client: ApolloClient,
    },
    contextTypes: {
      store: Store,
    },
    getChildContext(): {
      store: Store,
      client: ApolloClient,
    },
    render(): React$Element<*>,
  }
  declare export type MutationFunc<TResult> = (
    opts: MutationOptions
  ) => Promise<ApolloQueryResult<TResult>>;

  declare export type DefaultChildProps<P, R> = {
    data: QueryProps & R,
    mutate: MutationFunc<R>,
  } & P;

  declare export interface MutationOptions {
    variables?: { [key: string]: mixed },
    optimisticResponse?: Object,
    updateQueries?: MutationQueryReducersMap,
  }

  declare export interface QueryOptions {
    ssr?: boolean,
    variables?: {
      [key: string]: mixed,
    },
    fetchPolicy?: FetchPolicy,
    pollInterval?: number,
    skip?: boolean,
  }

  declare export interface QueryProps {
    error?: ApolloError,
    networkStatus: number,
    loading: boolean,
    variables?: {
      [variable: string]: any,
    },
    fetchMore: (
      fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions
    ) => Promise<ApolloQueryResult<any>>,
    refetch: (variables?: any) => Promise<ApolloQueryResult<any>>,
    startPolling: (pollInterval: number) => void,
    stopPolling: () => void,
    subscribeToMore: (options: SubscribeToMoreOptions) => () => void,
    updateQuery: (
      mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any
    ) => void,
  }

  declare export interface OptionProps<TProps, TResult> {
    ownProps: TProps,
    data?: QueryProps & TResult,
    mutate?: MutationFunc<TResult>,
  }

  declare export type OptionDescription<P> = (
    props: P
  ) => QueryOptions | MutationOptions;

  declare export interface OperationOption<TProps, TResult> {
    options?: OptionDescription<TProps>,
    props?: (props: OptionProps<TProps, TResult>) => any,
    skip?: boolean | ((props: any) => boolean),
    name?: string,
    withRef?: boolean,
    shouldResubscribe?: (props: TProps, nextProps: TProps) => boolean,
    alias?: string,
  }

  declare export interface OperationComponent<
    TResult: mixed = {},
    TOwnProps: mixed = {},
    TMergedProps = DefaultChildProps<TOwnProps, TResult>
  > {
    (
      component:
        | StatelessComponent<TMergedProps>
        | React$Component<*, TMergedProps, *>
    ): React$Component<*, TOwnProps, *>,
  }

  declare export function graphql<TResult, TProps, TChildProps>(
    document: DocumentNode,
    operationOptions?: OperationOption<TProps, TResult>
  ): OperationComponent<TResult, TProps, TChildProps>;

  declare export interface IDocumentDefinition {
    type: DocumentType,
    name: string,
    variables: VariableDefinitionNode[],
  }

  declare export function parser(document: DocumentNode): IDocumentDefinition;

  declare export function walkTree(
    element: any,
    context: any,
    visitor: (element: any, instance: any, context: any) => boolean | void
  ): void;

  declare export function getDataFromTree(
    rootElement: any,
    rootContext?: any,
    fetchRoot?: boolean
  ): Promise<void>;

  declare export function renderToStringWithData(
    component: any
  ): Promise<string>;

  declare export function cleanupApolloState(apolloState: any): void;
}
