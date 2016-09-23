import ApolloClient, {
  ApolloStore,
} from 'apollo-client';

// makes sure to retrieve the key in the redux state
// see https://github.com/apollostack/apollo-client/issues/676
export function reduxRootSelector(client: ApolloClient) {
  const state = <ApolloStore>client.store.getState();
  if (client.reduxRootKey) {
    return state[client.reduxRootKey];
  } else if (typeof client.reduxRootSelector === 'function') {
    return client.reduxRootSelector(state);
  }
  // fallback to default value
  return state['apollo'];
}
