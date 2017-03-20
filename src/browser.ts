export { default as ApolloProvider } from './ApolloProvider';
export { default as graphql, withApollo, InjectedGraphQLProps } from './graphql';


// expose easy way to join queries from redux
export { compose } from 'redux';

// re-exports of close dependencies.
export { default as ApolloClient, createNetworkInterface } from 'apollo-client';
export { default as gql } from 'graphql-tag'
