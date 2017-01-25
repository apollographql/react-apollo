import React, { Component } from 'react';

import {
  StyleSheet,
  Text,
  View,
  Image
} from 'react-native';

import gql from 'graphql-tag';
import { graphql } from 'react-apollo';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});

// The data prop, which is provided by the wrapper below contains,
// a `loading` key while the query is in flight and posts when it is ready
export const Pokemon = ({ data: { loading, pokemon, error } }) => {
  if (loading) {
    return <View style={styles.container}><Text style={styles.welcome}>Loading</Text></View>;
  }
  return (
    <View style={styles.container}>
      {pokemon && (
        <View>
          <Text style={styles.welcome}>{pokemon.name}</Text>
          <Image source={{ uri: pokemon.image }} style={{width: 200, height: 225 }} />
        </View>
      )}
    </View>
  );
}

export const POKEMON_QUERY = gql`
  query GetPokemon($name: String!) {
    pokemon(name: $name) {
      name
      image
    }
  }
`;

// The `graphql` wrapper executes a GraphQL query and makes the results
// available on the `data` prop of the wrapped component (Pokemon here)
export const withPokemon = graphql(POKEMON_QUERY, { options: {
  variables: { name: "charmander" },
}});

export default withPokemon(Pokemon);
