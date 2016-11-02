import ApolloProvider from './ApolloProvider';
import graphql, { withApollo } from './graphql';

// expose easy way to join queries from redux
import { compose } from 'redux';

export {
  ApolloProvider,
  graphql,
  withApollo,
  compose,
};

// Handle server-specific exports separately to not expose them in browser build
if (!process.browser) {
  const server = require('./server'); // tslint:disable-line

  exports.getDataFromTree = server.getDataFromTree;
  exports.renderToStringWithData = server.renderToStringWithData;
}
