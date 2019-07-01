import React, { useState } from 'react';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider } from '@apollo/react-testing';
import { render, cleanup } from '@testing-library/react';
import { useQuery } from '@apollo/react-hooks';

describe('useQuery Hook', () => {
  afterEach(cleanup);

  describe('General use', () => {
    it('should handle a simple query properly', done => {
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
          done();
        }
        return null;
      };

      render(
        <MockedProvider mocks={mocks}>
          <Component />
        </MockedProvider>
      );
    });
  });

  describe('Polling', () => {
    it('should support polling', done => {
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

      let renderCount = 0;
      const Component = () => {
        let { data, loading, stopPolling } = useQuery(query, {
          pollInterval: 10
        });
        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            break;
          case 1:
            expect(loading).toBeFalsy();
            expect(data).toEqual(resultData);
            break;
          case 2:
            expect(loading).toBeFalsy();
            expect(data).toEqual(resultData);
            stopPolling();
            setTimeout(() => {
              done();
            }, 10);
            break;
          case 3:
            done.fail('Uh oh - we should have stopped polling!');
            break;
          default:
          // Do nothing
        }
        renderCount += 1;
        return null;
      };

      render(
        <MockedProvider mocks={mocks}>
          <Component />
        </MockedProvider>
      );
    });

    it('should stop polling when skip is true', done => {
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

      let renderCount = 0;
      const Component = () => {
        const [shouldSkip, setShouldSkip] = useState(false);
        let { data, loading } = useQuery(query, {
          pollInterval: 10,
          skip: shouldSkip
        });

        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            break;
          case 1:
            expect(loading).toBeFalsy();
            expect(data).toEqual(resultData);
            break;
          case 2:
            expect(loading).toBeFalsy();
            expect(data).toEqual(resultData);
            setShouldSkip(true);
            break;
          case 3:
            expect(loading).toBeFalsy();
            expect(data).toBeUndefined();
            setTimeout(() => {
              done();
            }, 10);
            break;
          case 4:
            done.fail('Uh oh - we should have stopped polling!');
            break;
          default:
          // Do nothing
        }
        renderCount += 1;
        return null;
      };

      render(
        <MockedProvider mocks={mocks}>
          <Component />
        </MockedProvider>
      );
    });
  });
});
