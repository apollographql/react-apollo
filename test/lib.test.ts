import { ApolloClient, createNetworkInterface, NetworkInterface } from '../src';
import { gql } from '../src';

describe('react-apollo pacakge', () => {
  it('exports apollo-client', () => {
      expect(new ApolloClient()).toBeInstanceOf(ApolloClient);
  });

  it('exports createNetworkInterface', () => {
    expect(createNetworkInterface({ uri: 'localhost' })).toBeInstanceOf(NetworkInterface);
  });

  it('exports gql from graphql-tag', () => {
    expect(typeof gql).toBe('function');
  });
});
