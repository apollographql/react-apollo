import ApolloProvider from './ApolloProvider';
import graphql, { withApollo } from './graphql';

// expose easy way to join queries from redux
import { compose } from 'redux';

export { ApolloProvider, graphql, withApollo, compose };
