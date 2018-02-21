// @flow

import React from 'react';
import { graphql, type OperationComponent, type QueryProps } from 'react-apollo';
import gql from 'graphql-tag';

import type { GetCharacterQuery, GetCharacterQueryVariables } from './schema.flow.js';

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

type Props = GetCharacterQuery & QueryProps;

export const withCharacter: OperationComponent<
  GetCharacterQuery,
  GetCharacterQueryVariables,
  Props,
> = graphql(HERO_QUERY, {
  options: ({ episode }) => ({
    variables: { episode },
  }),
  props: ({ data }) => ({ ...data }),
});

export const CharacterWithoutData = ({ loading, hero, error }: Props) => {
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
                    {friend.appearsIn.map(epis => epis && epis.toLowerCase()).join(', ')}
                  </h6>
                ),
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
