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

export const HeroQuery = ({ episode, children }) => (
  <Query query={HERO_QUERY} variables={{ episode }}>
    {result => {
      const { loading, error, data } = result;
      return children({
        loading,
        error,
        hero: data && data.hero,
      });
    }}
  </Query>
);

export const Character = ({ loading, error, hero }) => {
  if (loading) {
    return <div>Loading</div>;
  }
  if (error) {
    return <h1>ERROR</h1>;
  }
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
                    {friend.name}: {friend.appearsIn.map(x => x && x.toLowerCase()).join(', ')}
                  </h6>
                ),
            )}
        </div>
      )}
    </div>
  );
};

export const App = () => (
  <HeroQuery episode="EMPIRE">{result => <Character {...result} />}</HeroQuery>
);
