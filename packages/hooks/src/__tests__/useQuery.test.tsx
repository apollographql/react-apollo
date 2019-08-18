import React, { useState, useReducer } from 'react';
import { DocumentNode, GraphQLError } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider, MockLink } from '@apollo/react-testing';
import { render, cleanup } from '@testing-library/react';
import { useQuery, ApolloProvider } from '@apollo/react-hooks';
import { ApolloClient } from 'apollo-client';
import { ApolloLink, Observable } from 'apollo-link';
import { InMemoryCache } from 'apollo-cache-inmemory';

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

    it('should keep data as undefined until data is actually returned', done => {
      const Component = () => {
        const { data, loading } = useQuery(CAR_QUERY);
        if (loading) {
          expect(data).toBeUndefined();
        } else {
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

    it('should only call onError callbacks once', done => {
      const query = gql`
        query SomeQuery {
          stuff {
            thing
          }
        }
      `;

      const resultData = { stuff: { thing: 'it!', __typename: 'Stuff' } };

      let callCount = 0;
      const link = new ApolloLink(() => {
        if (!callCount) {
          callCount += 1;
          return new Observable(observer => {
            observer.error(new Error('Oh no!'));
          });
        } else {
          return Observable.of({ data: resultData });
        }
      });

      const client = new ApolloClient({
        link,
        cache: new InMemoryCache()
      });

      const onErrorMock = jest.fn();

      let renderCount = 0;
      const Component = () => {
        const { loading, error, refetch, data, networkStatus } = useQuery(
          query,
          {
            onError: onErrorMock,
            notifyOnNetworkStatusChange: true
          }
        );

        console.log('ns', networkStatus);

        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            break;
          case 1:
            expect(loading).toBeFalsy();
            expect(error).toBeDefined();
            expect(error!.message).toEqual('Network error: Oh no!');
            setTimeout(() => {
              expect(onErrorMock.mock.calls.length).toBe(1);
              refetch();
            });
            break;
          case 2:
            expect(loading).toBeTruthy();
            break;
          case 3:
            expect(loading).toBeFalsy();
            expect(data).toEqual(resultData);
            done();
            break;
          default: // Do nothing
        }

        renderCount += 1;
        return null;
      };

      render(
        <ApolloProvider client={client}>
          <Component />
        </ApolloProvider>
      );
    });

    it('should persist errors on re-render if they are still valid', done => {
      const query = gql`
        query SomeQuery {
          stuff {
            thing
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

      let renderCount = 0;
      function App() {
        const [_, forceUpdate] = useReducer(x => x + 1, 0);
        const { loading, error } = useQuery(query);

        switch (renderCount) {
          case 0:
            expect(loading).toBeTruthy();
            expect(error).toBeUndefined();
            break;
          case 1:
            expect(error).toBeDefined();
            expect(error!.message).toEqual('GraphQL error: forced error');
            setTimeout(() => {
              forceUpdate(0);
            });
            break;
          case 2:
            expect(error).toBeDefined();
            expect(error!.message).toEqual('GraphQL error: forced error');
            done();
            break;
          default: // Do nothing
        }

        renderCount += 1;
        return null;
      }

      render(
        <MockedProvider mocks={mocks}>
          <App />
        </MockedProvider>
      );
    });
  });
});
