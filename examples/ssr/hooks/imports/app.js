import { useQuery } from '@apollo/react-hooks';
import gql from 'graphql-tag';

const HERO_QUERY = gql`
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

export const Character = ({ episode }) => {
  const { loading, error, data } = useQuery(HERO_QUERY, {
    variables: { episode }
  });

  if (loading) return <div>Loading</div>;
  if (error) return <h1>ERROR</h1>;

  return (
    <div>
      {data && data.hero && (
        <div>
          <h3>{data.hero.name}</h3>

          {data.hero.friends.map(friend => (
            <h6 key={friend.id}>
              {friend.name}:{' '}
              {friend.appearsIn.map(x => x.toLowerCase()).join(', ')}
            </h6>
          ))}
        </div>
      )}
    </div>
  );
};

export const App = () => (
  <div>
    <Character episode="NEWHOPE" />
  </div>
);
