import * as React from 'react';

const { Provider, Consumer } = React.createContext();

export const ApolloProvider = ({ client, children }) => (
  <Provider value={client}>{children}</Provider>
);

export { Consumer as ApolloConsumer };
