export * from './getDataFromTree';
export * from './renderToStringWithData';
export * from './ApolloProvider';
export * from './Query';
export * from './graphql';
export * from './withApollo';
export * from './types';

// expose easy way to join queries from redux
import * as compose from 'lodash.flowright';
export { compose };
