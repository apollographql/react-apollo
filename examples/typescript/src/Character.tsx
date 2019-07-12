import React from 'react';
import {
  GetCharacter,
  GetCharacterVariables,
  Episode
} from './__generated__/types';
import { GetCharacter as QUERY } from './queries';
import { Query } from '@apollo/react-components';

export interface CharacterProps {
  episode: Episode;
}

export const Character: React.SFC<CharacterProps> = props => {
  const { episode } = props;

  return (
    <Query<GetCharacter, GetCharacterVariables>
      query={QUERY}
      variables={{ episode }}
    >
      {({ loading, data, error }) => {
        if (loading) return <div>Loading</div>;
        if (error) return <h1>ERROR</h1>;
        if (!data) return <div>no data</div>;

        const { hero } = data;
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
                          {friend.appearsIn
                            .map(x => x && x.toLowerCase())
                            .join(', ')}
                        </h6>
                      )
                  )}
              </div>
            )}
          </div>
        );
      }}
    </Query>
  );
};

export default Character;
