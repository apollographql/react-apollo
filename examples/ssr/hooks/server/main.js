import { renderToString } from 'react-dom/server';
import { onPageLoad } from 'meteor/server-render';
import { ApolloClient } from 'apollo-client';
import { getMarkupFromTree, ApolloProvider } from '@apollo/react-hooks';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { WebApp } from 'meteor/webapp';
import { ApolloServer } from 'apollo-server-express';
import fetch from 'node-fetch';

import { typeDefs, resolvers } from '/imports/schema';
import { App } from '/imports/app';

export const render = async sink => {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: 'http://localhost:3000/graphql',
      fetch
    }),
    cache: new InMemoryCache(),
    ssrMode: true
  });

  const WrappedApp = (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );

  const start = Date.now();
  // Load all data from local server
  const markup = await getMarkupFromTree({
    tree: WrappedApp,
    renderFunction: renderToString
  });
  console.log('server rendering took', Date.now() - start, 'ms');
  sink.renderIntoElementById('app', markup);
  sink.appendToBody(`
    <script>
      window.__APOLLO_STATE__=${JSON.stringify(client.extract())};
    </script>
  `);
};

// Handle SSR
onPageLoad(render);

// Expose graphql endpoint
const server = new ApolloServer({ typeDefs, resolvers });
server.applyMiddleware({
  app: WebApp.connectHandlers,
  path: '/graphql'
});
