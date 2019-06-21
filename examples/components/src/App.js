import React from 'react';
import { Query } from '@apollo/react-components';
import gql from 'graphql-tag';

import Character from './character';

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

const App = ({ episode }) => (
  <Query query={HERO_QUERY} variables={{ episode }}>
    {result => {
      const { loading, error, data } = result;

      if (loading) {
        return <div>Loading</div>;
      }
      if (error) {
        return <h1>ERROR</h1>;
      }

      return <Character hero={data.hero} />;
    }}
  </Query>
);

export default App;
