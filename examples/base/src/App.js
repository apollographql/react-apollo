import * as React from 'react';
import { graphql } from '@apollo/react-hoc';
import gql from 'graphql-tag';

export const HERO_QUERY = gql`
  query GetCharacter($episode: Episode!) {
    hero(episode: $episode) {
      name
      id
      friends {
        name
        id
        appearsIn
      }
    }
  }
`;

export const withCharacter = graphql(HERO_QUERY, {
  options: ({ episode }) => ({
    variables: { episode }
  }),
  props: ({ data }) => ({ ...data })
});

export const CharacterWithoutData = ({ loading, hero, error }) => {
  if (loading) return <div>Loading</div>;
  if (error) return <h1>ERROR</h1>;
  return (
    <div>
      {hero && (
        <div>
          <h3>{hero.name}</h3>

          {hero.friends &&
            hero.friends.map(
              friend =>
                friend && (
                  <h6 key={friend.id}>
                    {friend.name}:{' '}
                    {friend.appearsIn.map(x => x && x.toLowerCase()).join(', ')}
                  </h6>
                )
            )}
        </div>
      )}
    </div>
  );
};

export const Character = withCharacter(CharacterWithoutData);

export const App = () => (
  <div>
    <Character episode="NEWHOPE" />
  </div>
);
