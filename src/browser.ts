export { default as ApolloProvider } from './ApolloProvider';
export { default as graphql, InjectedGraphQLProps } from './graphql';
export { withApollo } from './withApollo';

// expose easy way to join queries from redux
export { compose } from 'redux';

// re-exports of close dependencies.
export * from 'apollo-client';
export { default as gql } from 'graphql-tag';
