import React from 'react';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider } from '@apollo/react-testing';
import { useQuery } from '@apollo/react-hooks';
import { renderToStringWithData } from '@apollo/react-ssr';

describe('useQuery Hook SSR', () => {
  it('should support SSR', () => {
    const query: DocumentNode = gql`
      query {
        cars {
          make
          model
          vin
        }
      }
    `;

    const resultData = {
      cars: [
        {
          make: 'Audi',
          model: 'RS8',
          vin: 'DOLLADOLLABILL',
          __typename: 'Car'
        }
      ]
    };

    const mocks = [
      {
        request: {
          query
        },
        result: { data: resultData }
      }
    ];

    const Component = () => {
      const { data, loading } = useQuery(query);
      if (!loading) {
        expect(data).toEqual(resultData);
        const { make, model, vin } = data.cars[0];
        return (
          <div>
            {make}, {model}, {vin}
          </div>
        );
      }
      return null;
    };

    const app = (
      <MockedProvider mocks={mocks}>
        <Component />
      </MockedProvider>
    );

    return renderToStringWithData(app).then(markup => {
      expect(markup).toMatch(/Audi/);
    });
  });

  it('should initialize data as an empty object when loading', () => {
    const query: DocumentNode = gql`
      query {
        foo {
          bar
        }
      }
    `;

    const resultData = {
      foo: {
        __typename: 'Foo',
        bar: 'baz'
      }
    };

    const mocks = [
      {
        request: {
          query
        },
        result: { data: resultData }
      }
    ];

    const Component = () => {
      const { data, loading } = useQuery(query);
      if (loading) {
        expect(data).toEqual({});
      }
      return null;
    };

    const app = (
      <MockedProvider mocks={mocks}>
        <Component />
      </MockedProvider>
    );

    return renderToStringWithData(app);
  });
});
