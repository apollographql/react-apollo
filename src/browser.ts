export { default as ApolloProvider } from './ApolloProvider';
export { default as Query } from './Query';
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

// expose easy way to join queries from redux
import * as compose from 'lodash.flowright';
export { compose };
