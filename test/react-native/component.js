// Intro.js
import React, {Component} from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';

// react native doesn't support jsx so typescript isn't useful yet
// there is a PR in typescript to allow jsx to convert to js which
// would allow us to use the src files again
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import { ApolloProvider, graphql } from '../../lib/src';
import mockNetworkInterface from '../../lib/test/mocks/mockNetworkInterface';

export const query = gql`query people { allPeople(first: 1) { people { name } } }`;
export const data = { allPeople: { people: { name: 'Luke Skywalker' } } };
export const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
export const client = new ApolloClient({ networkInterface });

export const ContainerWithData =  graphql(query)(({ data }) => { // tslint:disable-line
  if (data.loading) return <Text>Loading...</Text>
  return <Text>{data.allPeople.people.name}</Text>;
});

export default class App extends Component {
  render() {
    return (
      <ApolloProvider client={client} >
        <ContainerWithData />
      </ApolloProvider>
    );
  }
}
