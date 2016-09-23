import ApolloClient from 'apollo-client';
import { createStore } from 'redux';
import { reduxRootSelector } from '../src/apolloClient';

const emptyApolloState = {
  queries: {},
  mutations: {},
  data: {},
  optimistic: [],
};

// I need this method to be able to set the store in the client
// I do it by simulating a call from  the middleware
const setClientStore = (client, state) => {
  const store = createStore((_) => (_), state);
  client.middleware()(store);
  return client;
};

const createClient = (opts, initialState) => {
  const client = new ApolloClient(opts);
  return setClientStore(client, initialState);
};

describe('apolloClient', () => {
  describe('reduxRootSelector', () => {
    it('should return the expected state, if "reduxRootKey" is set in the client', () => {
      const initialState = { fromReduxRootKey: emptyApolloState };
      const client = createClient({
        reduxRootKey: 'fromReduxRootKey',
      }, initialState);
      const state = reduxRootSelector(client);
      expect(state).toBe(emptyApolloState);
    });
    it('should return the expected state if "reduxRootSelector" is set in the client as string', () => {
      const initialState = { fromReduxRootSelector: emptyApolloState };
      const client = createClient({
        reduxRootSelector: 'fromReduxRootSelector',
      }, initialState);
      const state = reduxRootSelector(client);
      expect(state).toBe(emptyApolloState);
    });
    it('should return the expected state if "reduxRootSelector" is set in the client as function', () => {
      const initialState = { fromReduxRootSelector: emptyApolloState };
      const client = createClient({
        reduxRootSelector: (state) => state.fromReduxRootSelector,
      }, initialState);
      const state = reduxRootSelector(client);
      expect(state).toBe(emptyApolloState);
    });
    it('should fallback to "apollo" key in the state if neither reduxRootKey nor reduxRootSelector is set in the client', () => {
      const client = new ApolloClient();
      client.initStore();
      const state = reduxRootSelector(client);
      expect(state).toEqual(emptyApolloState);
    });
  });
});
