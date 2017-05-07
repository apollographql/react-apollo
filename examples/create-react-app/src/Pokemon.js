import React from 'react';
import gql from 'graphql-tag';
import { graphql } from '../../../';

// The data prop, which is provided by the wrapper below contains,
// a `loading` key while the query is in flight and posts when it is ready
export const Pokemon = ({ data: { loading, pokemon, error } }) => {
  if (loading) return <div>Loading</div>;
  if (error) return <h1>ERROR</h1>;
  return (
    <div>
      {pokemon && (
        <div>
          <h3>{pokemon.name}</h3>
          <img alt={pokemon.name} src={pokemon.image} />
        </div>
      )}
    </div>
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
