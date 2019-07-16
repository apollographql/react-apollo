import React from 'react';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider, mockSingleLink } from '@apollo/react-testing';
import { ApolloProvider, useQuery } from '@apollo/react-hooks';
import { renderToStringWithData } from '@apollo/react-ssr';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

describe('useQuery Hook SSR', () => {
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

  it('should support SSR', () => {
    const Component = () => {
      const { data, loading } = useQuery(CAR_QUERY);
      if (!loading) {
        expect(data).toEqual(CAR_RESULT_DATA);
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
      <MockedProvider mocks={CAR_MOCKS}>
        <Component />
      </MockedProvider>
    );

    return renderToStringWithData(app).then(markup => {
      expect(markup).toMatch(/Audi/);
    });
  });

  it('should initialize data as an empty object when loading', () => {
    const Component = () => {
      const { data, loading } = useQuery(CAR_QUERY);
      if (loading) {
        expect(data).toEqual({});
      }
      return null;
    };

    const app = (
      <MockedProvider mocks={CAR_MOCKS}>
        <Component />
      </MockedProvider>
    );

    return renderToStringWithData(app);
  });

  it('should skip SSR if `ssr` option is `false`', () => {
    const Component = () => {
      const { data, loading } = useQuery(CAR_QUERY, { ssr: false });
      if (!loading) {
        expect(data).toEqual(CAR_RESULT_DATA);
        const { make } = data.cars[0];
        return <div>{make}</div>;
      }
      return null;
    };

    const app = (
      <MockedProvider mocks={CAR_MOCKS}>
        <Component />
      </MockedProvider>
    );

    return renderToStringWithData(app).then(result => {
      expect(result).toEqual('');
    });
  });

  describe('Lazy mode', () => {
    it(
      'should run query only after calling the lazy mode execute function, ' +
        'when lazy mode is enabled',
      () => {
        const link = mockSingleLink({
          request: { query: CAR_QUERY },
          result: { data: CAR_RESULT_DATA }
        });

        const client = new ApolloClient({
          cache: new InMemoryCache(),
          link,
          ssrMode: true
        });

        const Component = () => {
          let html = null;
          const [{ loading, called, data }, execute] = useQuery(CAR_QUERY, {
            lazy: true
          });

          if (!loading && !called) {
            execute();
          }

          if (!loading && called) {
            expect(loading).toEqual(false);
            expect(data).toEqual(CAR_RESULT_DATA);
            html = <p>{data.cars[0].make}</p>;
          }

          return html;
        };

        const app = (
          <ApolloProvider client={client}>
            <Component />
          </ApolloProvider>
        );

        return renderToStringWithData(app).then(markup => {
          expect(markup).toMatch(/Audi/);
        });
      }
    );

    it('should show full result content when using SSR with lazy mode set to `false`', () => {
      let renderCount = 0;
      const Component = () => {
        let html = null;
        const [{ loading, data }] = useQuery(CAR_QUERY, {
          lazy: false
        });
        switch (renderCount) {
          case 0:
            expect(loading).toEqual(true);
            html = <p>Loading ...</p>;
            break;
          case 1:
            expect(loading).toEqual(false);
            expect(data).toEqual(CAR_RESULT_DATA);
            html = <p>{data.cars[0].make}</p>;
            break;
          default: // Do nothing
        }
        renderCount += 1;
        return html;
      };

      const app = (
        <MockedProvider mocks={CAR_MOCKS}>
          <Component />
        </MockedProvider>
      );

      return renderToStringWithData(app).then(markup => {
        expect(markup).toMatch(/Audi/);
      });
    });
  });
});
