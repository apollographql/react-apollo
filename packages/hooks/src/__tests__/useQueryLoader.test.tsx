import React from 'react';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider } from '@apollo/react-testing';
import { render, cleanup } from 'react-testing-library';

import { useQueryLoader } from '../useQueryLoader';

describe('useQueryLoader Hook', () => {
  afterEach(cleanup);

  const Loader = () => <div>Loading...</div>;
  const ErrorMessage = ({ errorObject }: { errorObject: Error }) => (
    <div>{errorObject.message}</div>
  );

  const options = {
    defaultLoadingComponent: Loader,
    defaultErrorComponent: ErrorMessage
  };

  const query: DocumentNode = gql`
    query {
      cars {
        make
        model
        vin
      }
    }
  `;

  it('should handle a simple query properly', done => {
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

    const Component = () =>
      useQueryLoader(query)(({ data }) => {
        expect(data).toEqual(resultData);
        done();
        return null;
      });

    const { container } = render(
      <MockedProvider mocks={mocks} contextOptions={options}>
        <Component />
      </MockedProvider>
    );

    expect(container.innerHTML).toEqual('<div>Loading...</div>');
  });

  it('should handle errors', done => {
    const mockError = [
      {
        request: { query },
        error: new Error('test error')
      }
    ];

    const Component = () => useQueryLoader(query, { onError })(() => null);

    const { container } = render(
      <MockedProvider mocks={mockError} contextOptions={options}>
        <Component />
      </MockedProvider>
    );

    expect(container.innerHTML).toEqual('<div>Loading...</div>');

    function onError(err: Error) {
      expect(err.message).toContain('test error');
      done();
    }
  });
});
