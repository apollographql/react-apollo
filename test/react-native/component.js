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
import gql from 'graphql-tag';
import { ApolloProvider, graphql } from '../../lib/src';

const query = gql`query people { allPeople(first: 1) { people { name } } }`;

export default graphql(query)(({ data }) => {
  if (data.loading) return <Text>Loading...</Text>
  return <Text>{data.allPeople.people.name}</Text>;
});
