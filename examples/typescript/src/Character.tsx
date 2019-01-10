import * as React from 'react';
import { GetCharacterQuery, GetCharacterQueryVariables, Episode } from './__generated__/types';
import { GetCharacter as QUERY } from './queries';
import { Query } from 'react-apollo';

export interface CharacterProps {
  episode: Episode;
}

export const Character: React.SFC<CharacterProps> = props => {
  const { episode } = props;

  return (
    <Query<GetCharacterQuery, GetCharacterQueryVariables> query={QUERY} variables={{ episode }}>
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
                          {friend.appearsIn.map(x => x && x.toLowerCase()).join(', ')}
                        </h6>
                      ),
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
