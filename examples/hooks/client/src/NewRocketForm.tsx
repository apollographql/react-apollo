import React, { useState } from 'react';
import {
  Row,
  Col,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert
} from 'reactstrap';
import { useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';

import { NewRocketDetails, RocketInventory } from './types';

const SAVE_ROCKET = gql`
  mutation saveRocket($rocket: RocketInput!) {
    saveRocket(rocket: $rocket) {
      model
    }
  }
`;

export function NewRocketForm() {
  const [model, setModel] = useState('');
  const [year, setYear] = useState(0);
  const [stock, setStock] = useState(0);

  const [saveRocket, { error, data }] = useMutation<
    {
      saveRocket: RocketInventory;
    },
    { rocket: NewRocketDetails }
  >(SAVE_ROCKET, {
    variables: { rocket: { model: model, year: +year, stock: +stock } },
    refetchQueries: ['getRocketInventory']
  });

  return (
    <div className="new-rocket-form mt-3">
      <h3>Add a Rocket</h3>
      {error ? <Alert color="danger">Oh no! {error.message}</Alert> : null}
      {data && data.saveRocket ? (
        <Alert color="success">
          Model <strong>{data.saveRocket.model}</strong> added!
        </Alert>
      ) : null}
      <Form style={{ border: '1px solid #ddd', padding: '15px' }}>
        <Row>
          <Col sm="6">
            <FormGroup>
              <Label for="model">Model</Label>
              <Input
                type="text"
                name="model"
                id="model"
                onChange={e => setModel(e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col sm="3">
            <FormGroup>
              <Label for="year">Year</Label>
              <Input
                type="number"
                name="year"
                id="year"
                onChange={e => setYear(+e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col sm="3">
            <FormGroup>
              <Label for="stock">Stock</Label>
              <Input
                type="number"
                name="stock"
                id="stock"
                onChange={e => setStock(+e.target.value)}
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col
            sm="12"
            className="text-right"
            onClick={e => {
              e.preventDefault();
              if (model && year && stock) {
                saveRocket();
              }
            }}
          >
            <Button>Add</Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
