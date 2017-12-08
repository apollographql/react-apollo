export { default as ApolloProvider } from './ApolloProvider';
export { default as graphql } from './graphql';
export {
  MutationOpts,
  QueryOpts,
  QueryProps,
  NamedProps,
  MutationFunc,
  OptionProps,
  ChildProps,
  OperationOption,
} from './types';
export { withApollo } from './withApollo';

// expose getDataFromTree for the client
export { getDataFromTree } from './getDataFromTree';

// expose easy way to join queries from redux
import flowRight from 'lodash-es/flowRight';
export { flowRight as compose };
