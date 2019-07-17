import React, { useState } from 'react';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider } from '@apollo/react-testing';
import { render, cleanup } from '@testing-library/react';
import { ApolloProvider, useLazyQuery } from '@apollo/react-hooks';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

describe('useLazyQuery Hook', () => {
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

  it('should hold query execution until manually triggered', done => {
    let renderCount = 0;
    const Component = () => {
      const [{ loading, data }, execute] = useLazyQuery(CAR_QUERY);
      switch (renderCount) {
        case 0:
          expect(loading).toEqual(false);
          execute();
          break;
        case 1:
          expect(loading).toEqual(true);
          break;
        case 2:
          expect(loading).toEqual(false);
          expect(data).toEqual(CAR_RESULT_DATA);
          done();
          break;
        default: // Do nothing
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

  it('should set `called` to false by default', () => {
    const Component = () => {
      const [{ loading, called }] = useLazyQuery(CAR_QUERY);
      expect(loading).toBeFalsy();
      expect(called).toBeFalsy();
      return null;
    };

    render(
      <MockedProvider mocks={CAR_MOCKS}>
        <Component />
      </MockedProvider>
    );
  });

  it('should set `called` to true after calling the lazy execute function', done => {
    let renderCount = 0;
    const Component = () => {
      const [{ loading, called, data }, execute] = useLazyQuery(CAR_QUERY);
      switch (renderCount) {
        case 0:
          expect(loading).toBeFalsy();
          expect(called).toBeFalsy();
          execute();
          break;
        case 1:
          expect(loading).toBeTruthy();
          expect(called).toBeTruthy();
          break;
        case 2:
          expect(loading).toEqual(false);
          expect(called).toBeTruthy();
          expect(data).toEqual(CAR_RESULT_DATA);
          done();
          break;
        default: // Do nothing
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

  it('should override `skip` if lazy mode execution function is called', done => {
    let renderCount = 0;
    const Component = () => {
      const [skip, setSkip] = useState(true);
      const [{ loading, data }, execute] = useLazyQuery(CAR_QUERY, {
        skip
      });
      switch (renderCount) {
        case 0:
          expect(loading).toBeFalsy();
          setSkip(false);
          break;
        case 1:
          expect(loading).toBeFalsy();
          execute();
          break;
        case 2:
          expect(loading).toBeTruthy();
          break;
        case 3:
          expect(loading).toEqual(false);
          expect(data).toEqual(CAR_RESULT_DATA);
          done();
          break;
        default: // Do nothing
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

  it(
    'should use variables defined in hook options (if any), when running ' +
      'the lazy execution function',
    done => {
      const CAR_QUERY: DocumentNode = gql`
        query AllCars($year: Int!) {
          cars(year: $year) @client {
            make
            year
          }
        }
      `;

      const CAR_RESULT_DATA = [
        {
          make: 'Audi',
          year: 2000,
          __typename: 'Car'
        },
        {
          make: 'Hyundai',
          year: 2001,
          __typename: 'Car'
        }
      ];

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        resolvers: {
          Query: {
            cars(_root, { year }) {
              return CAR_RESULT_DATA.filter(car => car.year === year);
            }
          }
        }
      });

      let renderCount = 0;
      const Component = () => {
        const [{ loading, data }, execute] = useLazyQuery(CAR_QUERY, {
          variables: { year: 2001 }
        });
        switch (renderCount) {
          case 0:
            expect(loading).toBeFalsy();
            execute();
            break;
          case 1:
            expect(loading).toBeTruthy();
            break;
          case 2:
            expect(loading).toEqual(false);
            expect(data.cars).toEqual([CAR_RESULT_DATA[1]]);
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
    }
  );

  it(
    'should use variables passed into lazy execution function, ' +
      'overriding similar variables defined in Hook options',
    done => {
      const CAR_QUERY: DocumentNode = gql`
        query AllCars($year: Int!) {
          cars(year: $year) @client {
            make
            year
          }
        }
      `;

      const CAR_RESULT_DATA = [
        {
          make: 'Audi',
          year: 2000,
          __typename: 'Car'
        },
        {
          make: 'Hyundai',
          year: 2001,
          __typename: 'Car'
        }
      ];

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        resolvers: {
          Query: {
            cars(_root, { year }) {
              return CAR_RESULT_DATA.filter(car => car.year === year);
            }
          }
        }
      });

      let renderCount = 0;
      const Component = () => {
        const [{ loading, data }, execute] = useLazyQuery(CAR_QUERY, {
          variables: { year: 2001 }
        });
        switch (renderCount) {
          case 0:
            expect(loading).toBeFalsy();
            execute({ variables: { year: 2000 } });
            break;
          case 1:
            expect(loading).toBeTruthy();
            break;
          case 2:
            expect(loading).toEqual(false);
            expect(data.cars).toEqual([CAR_RESULT_DATA[0]]);
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
    }
  );
});
