import { ApolloClient, createNetworkInterface } from '../src';
import { gql } from '../src';

describe('react-apollo pacakge', () => {
  it('exports apollo-client', () => {
    expect(new ApolloClient()).toBeInstanceOf(ApolloClient);
  });

  it('exports createNetworkInterface', () => {
    expect(typeof createNetworkInterface).toBe('function');
  });

  it('exports gql from graphql-tag', () => {
    expect(typeof gql).toBe('function');
  });
});
