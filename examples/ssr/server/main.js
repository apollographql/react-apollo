import { renderToString } from 'react-dom/server';
import { onPageLoad } from 'meteor/server-render';
import { createApolloServer } from 'meteor/apollo';
import { graphql } from 'graphql';
import { print } from 'graphql/language/printer';

import { ApolloClient, getDataFromTree, ApolloProvider } from 'react-apollo';

import { schema } from '/imports/schema';
import { App } from '/imports/app';

export const render = async sink => {
  const client = new ApolloClient({
    // simple local interface to query graphql directly
    networkInterface: {
      query: ({ query, variables, operationName }) =>
        graphql(schema, print(query), {}, {}, variables, operationName),
    },
    ssrMode: true,
  });

  const WrappedApp = (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );

  // load all data from local server;
  await getDataFromTree(WrappedApp);

  const body = renderToString(WrappedApp);
  sink.renderIntoElementById('app', body);
  sink.appendToBody(`
    <script>window.__APOLLO_STATE__=${JSON.stringify(
      client.getInitialState(),
    )};</script>
  `);
};

// hanlde SSR
onPageLoad(render);

// expose graphql endpoint
createApolloServer({ schema });
