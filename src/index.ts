import ApolloProvider from './ApolloProvider';
import graphql, { withApollo } from './graphql';

// expose easy way to join queries from recompose
import {compose} from 'recompose';

export { ApolloProvider, graphql, withApollo, compose };
