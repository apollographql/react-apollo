import { render } from 'react-dom';
import { onPageLoad } from 'meteor/server-render';
import {
  ApolloProvider,
  ApolloClient,
  createNetworkInterface,
} from 'react-apollo';

import { App } from '/imports/app';

export const start = () => {
  const client = new ApolloClient({
    networkInterface: createNetworkInterface({ uri: 'http://localhost:3000' }),
    initialState: { apollo: window.__APOLLO_STATE__ },
  });

  const WrappedApp = (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );

  render(WrappedApp, document.getElementById('app'));
};

onPageLoad(start);
