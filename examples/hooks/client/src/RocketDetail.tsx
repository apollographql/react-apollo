import React from 'react';
import { useQueryLoader } from '@apollo/react-hooks';
import gql from 'graphql-tag';

import { RocketInventory } from './types';

const GET_ROCKET_DETAILS = gql`
  query getRocket($id: ID!) {
    rocket(id: $id) {
      id
      model
      year
      stock
    }
  }
`;

export interface RocketDetailProps {
  rocketId: number;
}

export function RocketDetail({ rocketId }: RocketDetailProps) {
  return useQueryLoader(GET_ROCKET_DETAILS, {
    variables: { id: rocketId }
  })(({ data: { rocket } }: { data: { rocket: RocketInventory } }) => {
    if (!rocket) {
      return <div>Rocket ID {rocketId} not found</div>;
    }
    return (
      <article>
        <h2>Rocket Details</h2>
        <dl>
          <dt>Model</dt>
          <dd>{rocket.model}</dd>
          <dt>Year</dt>
          <dd>{rocket.year}</dd>
          <dt>Stock</dt>
          <dd>{rocket.stock}</dd>
        </dl>
      </article>
    );
  });
}
