import React, { useState } from 'react';
import { DocumentNode, GraphQLError } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider, MockLink } from '@apollo/react-testing';
import { render, cleanup } from '@testing-library/react';
import { useQuery } from '@apollo/react-hooks';

describe('useQuery Hook', () => {
  const CAR_QUERY: DocumentNode = gql`
    query {
      cars {
        make
        model
        vin
      }
    }
  `;

  const CAR_RESULT_DATA = {
    cars: [
      {
        make: 'Audi',
        model: 'RS8',
        vin: 'DOLLADOLLABILL',
        __typename: 'Car'
      }
    ]
  };

  const CAR_MOCKS = [
    {
      request: {
        query: CAR_QUERY
      },
      result: { data: CAR_RESULT_DATA }
    }
  ];

  afterEach(cleanup);

  describe('General use', () => {
    it('should handle a simple query properly', done => {
      const Component = () => {
        const { data, loading } = useQuery(CAR_QUERY);
        if (!loading) {
          expect(data).toEqual(CAR_RESULT_DATA);
          done();
        }
        return null;
      };

      render(
        <MockedProvider mocks={CAR_MOCKS}>
          <Component />
        </MockedProvider>
      );
    });
  });

  describe('Polling', () => {
    it('should support polling', done => {
      let renderCount = 0;
      const Component = () => {
        let { data, loading, stopPolling } = useQuery(CAR_QUERY, {
          pollInterval: 10
        });
        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            break;
          case 1:
            expect(loading).toBeFalsy();
            expect(data).toEqual(CAR_RESULT_DATA);
            break;
          case 2:
            expect(loading).toBeFalsy();
            expect(data).toEqual(CAR_RESULT_DATA);
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
        <MockedProvider mocks={CAR_MOCKS}>
          <Component />
        </MockedProvider>
      );
    });

    it('should stop polling when skip is true', done => {
      let renderCount = 0;
      const Component = () => {
        const [shouldSkip, setShouldSkip] = useState(false);
        let { data, loading } = useQuery(CAR_QUERY, {
          pollInterval: 10,
          skip: shouldSkip
        });

        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            break;
          case 1:
            expect(loading).toBeFalsy();
            expect(data).toEqual(CAR_RESULT_DATA);
            break;
          case 2:
            expect(loading).toBeFalsy();
            expect(data).toEqual(CAR_RESULT_DATA);
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
        <MockedProvider mocks={CAR_MOCKS}>
          <Component />
        </MockedProvider>
      );
    });

    it('should stop polling when the component is unmounted', done => {
      const mockLink = new MockLink(CAR_MOCKS);
      const linkRequestSpy = jest.spyOn(mockLink, 'request');
      let renderCount = 0;
      const QueryComponent = ({ unmount }: { unmount: () => void }) => {
        const { data, loading } = useQuery(CAR_QUERY, { pollInterval: 10 });
        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            break;
          case 1:
            expect(loading).toBeFalsy();
            expect(data).toEqual(CAR_RESULT_DATA);
            expect(linkRequestSpy).toHaveBeenCalledTimes(1);
            break;
          case 2:
            expect(loading).toBeFalsy();
            expect(data).toEqual(CAR_RESULT_DATA);
            expect(linkRequestSpy).toHaveBeenCalledTimes(2);
            unmount();
            break;
          default:
        }
        renderCount += 1;
        return null;
      };

      const Component = () => {
        const [queryMounted, setQueryMounted] = useState(true);
        const unmount = () => setTimeout(() => setQueryMounted(false), 0);
        if (!queryMounted)
          setTimeout(() => {
            expect(linkRequestSpy).toHaveBeenCalledTimes(2);
            done();
          }, 30);
        return <>{queryMounted && <QueryComponent unmount={unmount} />}</>;
      };

      render(
        <MockedProvider mocks={CAR_MOCKS} link={mockLink}>
          <Component />
        </MockedProvider>
      );
    });

    it('should set called to true by default', () => {
      const Component = () => {
        const { loading, called } = useQuery(CAR_QUERY);
        expect(loading).toBeTruthy();
        expect(called).toBeTruthy();
        return null;
      };

      render(
        <MockedProvider mocks={CAR_MOCKS}>
          <Component />
        </MockedProvider>
      );
    });
  });

  describe('Error handling', () => {
    it("should render GraphQLError's", done => {
      const query = gql`
        query TestQuery {
          rates(currency: "USD") {
            rate
          }
        }
      `;

      const mocks = [
        {
          request: { query },
          result: {
            errors: [new GraphQLError('forced error')]
          }
        }
      ];

      const Component = () => {
        const { loading, error } = useQuery(query);
        if (!loading) {
          expect(error).toBeDefined();
          expect(error!.message).toEqual('GraphQL error: forced error');
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
});
