import React from 'react';
import { useQuery } from '@apollo/react-hooks';
import gql from 'graphql-tag';
import { Row, Col } from 'reactstrap';

import { RocketInventory } from './types';

const GET_ROCKET_INVENTORY = gql`
  query getRocketInventory {
    rocketInventory {
      id
      model
      year
      stock
    }
  }
`;

export function RocketInventoryList() {
  const { loading, data } = useQuery(GET_ROCKET_INVENTORY);
  return (
    <Row className="rocket-inventory-list mt-4">
      <Col sm="12">
        <h3>Available Inventory</h3>
        {loading ? (
          <p>Loading ...</p>
        ) : (
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Model</th>
                <th>Year</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.rocketInventory.map((inventory: RocketInventory) => (
                <tr
                  key={`${inventory.model}-${inventory.year}-${
                    inventory.stock
                  }`}
                >
                  <td>{inventory.model}</td>
                  <td>{inventory.year}</td>
                  <td>{inventory.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Col>
    </Row>
  );
}
