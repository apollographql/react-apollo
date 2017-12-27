export { default as getDataFromTree } from './getDataFromTree';
export * from './getDataFromTree';

export { default as renderToStringWithData } from './renderToStringWithData';

export { default as ApolloProvider } from './ApolloProvider';
export * from './ApolloProvider';

export { default as Query } from './Query';
export * from './Query';

export { default as graphql } from './graphql';
export * from './graphql';

export { default as withApollo } from './withApollo';

export * from './types';

// expose easy way to join queries from redux
const compose = require('lodash/flowright');
export { compose };
