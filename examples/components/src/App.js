import React from 'react';
import { Query } from 'react-apollo';
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

const Character = ({ episode }) => (
  <Query
    query={HERO_QUERY}
    options={{
      variables: {
        episode,
      },
    }}
    loading={() => <div>Loading</div>}
    error={() => <h1>ERROR</h1>}
    render={result => {
      const { hero } = result.data;
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
                    ),
                )}
            </div>
          )}
        </div>
      );
    }}
  />
);

export const App = () => (
  <div>
    <Character episode="EMPIRE" />
  </div>
);
