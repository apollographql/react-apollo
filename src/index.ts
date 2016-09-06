import ApolloProvider from './ApolloProvider';
import graphql, { withApollo } from './graphql';

// expose easy way to join queries from recompose
import compose from 'recompose/compose';

export { ApolloProvider, graphql, withApollo, compose };
