import * as React from 'react';
import {
  GetCharacter,
  GetCharacter_hero_friends,
} from './__generated__/GetCharacter';
import { Query, QueryResult } from 'react-apollo';
// import Query, { QueryResult } from '../../../src/Query';

const QUERY = require('./Character.graphql');
// https://github.com/Microsoft/TypeScript/issues/6395#issuecomment-282133254
class CharacterQuery extends Query<GetCharacter> {}

export interface CharacterProps {
  episode: string;
}

export const Character = (props: CharacterProps) => {
  const { episode } = props;
  return (
    <CharacterQuery query={QUERY} variables={{ episode }}>
      {({ loading, data, error }: QueryResult<GetCharacter>) => {
        if (loading) return <div>Loading</div>;
        if (error) return <h1>ERROR</h1>;
        const { hero } = data;
        return (
          <div>
            {hero && (
              <div>
                <h3>{hero.name}</h3>
                {hero.friends &&
                  hero.friends.map(
                    (friend: GetCharacter_hero_friends) =>
                      friend && (
                        <h6 key={friend.id}>
                          {friend.name}:{' '}
                          {friend.appearsIn
                            .map(x => x && x.toLowerCase())
                            .join(', ')}
                        </h6>
                      ),
                  )}
              </div>
            )}
          </div>
        );
      }}
    </CharacterQuery>
  );
};

export default Character;
