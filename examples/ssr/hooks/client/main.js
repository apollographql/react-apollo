import { hydrate } from 'react-dom';
import { onPageLoad } from 'meteor/server-render';
import { ApolloProvider } from '@apollo/react-hooks';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';

import { App } from '/imports/app';

export const start = () => {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: 'http://localhost:3000/graphql'
    }),
    cache: new InMemoryCache().restore(window.__APOLLO_STATE__)
  });

  const WrappedApp = (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );

  hydrate(WrappedApp, document.getElementById('app'));
};

onPageLoad(start);
