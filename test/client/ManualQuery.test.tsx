import * as React from 'react';
import ApolloClient, { NetworkStatus } from 'apollo-client';
import { mount, ReactWrapper } from 'enzyme';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider, ManualQuery } from '../../src';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';
import catchAsyncError from '../test-utils/catchAsyncError';
import stripSymbols from '../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';

const allPeopleQuery: DocumentNode = gql`
  query people {
    allPeople(first: 1) {
      people {
        name
      }
    }
  }
`;

const allPeopleQueryWithVariables: DocumentNode = gql`
  query people($first: Int!) {
    allPeople(first: $first) {
      people {
        name
      }
    }
  }
`;

interface Data {
  allPeople: {
    people: Array<{ name: string }>;
  };
}

const allPeopleData: Data = {
  allPeople: { people: [{ name: 'Luke Skywalker' }] },
};
const allPeopleMocks = [
  {
    request: { query: allPeopleQuery },
    result: { data: allPeopleData },
  },
];

const allPeopleWithVariablesMocks = [
  {
    request: { query: allPeopleQueryWithVariables, variables: { first: 1 } },
    result: { data: allPeopleData },
  },
];

class AllPeopleQuery extends ManualQuery<Data, { first: number }> {}

it('errors if there is no client instance in the context', () => {
  expect.assertions(1);
  console.error = jest.fn();
  expect(() => mount(<AllPeopleQuery>{() => null}</AllPeopleQuery>)).toThrow(
    'Could not find "client" in the context of ManualQuery. Wrap the root component in an <ApolloProvider>',
  );
});

it('passes a load function as the first param of the render prop', done => {
  let count = 0;
  const Component = () => (
    <AllPeopleQuery query={allPeopleQueryWithVariables} variables={{ first: 1 }}>
      {(load, result) => {
        catchAsyncError(done, () => {
          if (count === 0) {
            expect(result).toEqual({
              loading: false,
              error: undefined,
              data: undefined,
              called: false,
            });

            setTimeout(() => load());
          } else if (count === 1) {
            expect(result).toEqual({
              loading: true,
              error: undefined,
              data: undefined,
              called: true,
            });
          } else if (count === 2) {
            expect(result).toMatchSnapshot();
            done();
            setTimeout(() => load());
          } else if (count === 3) {
            expect(result).toEqual({
              loading: true,
              called: true,
            });
            done();
          }

          count++;
        });

        return null;
      }}
    </AllPeopleQuery>
  );

  mount(
    <MockedProvider mocks={allPeopleWithVariablesMocks} addTypename={false}>
      <Component />
    </MockedProvider>,
  );
});

it('accepts variables in the load function that take precendence over those passed in the props', done => {
  let count = 0;

  const Component = () => (
    <AllPeopleQuery query={allPeopleQueryWithVariables} variables={{ first: 2 }}>
      {(load, result) => {
        catchAsyncError(done, () => {
          if (count === 0) {
            setTimeout(() =>
              load({
                variables: { first: 1 },
              }).then(data => {
                expect(data).toMatchSnapshot('return of load() function');
              }),
            );
          } else if (count === 2) {
            expect(result).toMatchSnapshot('result props');
            done();
          }

          count++;
        });

        return null;
      }}
    </AllPeopleQuery>
  );

  mount(
    <MockedProvider mocks={allPeopleWithVariablesMocks} addTypename={false}>
      <Component />
    </MockedProvider>,
  );
});

it('manages an error', done => {
  let count = 0;

  const Component = () => (
    <AllPeopleQuery query={allPeopleQuery}>
      {(load, result) => {
        catchAsyncError(done, () => {
          if (count === 0) {
            setTimeout(() => load());
          } else if (count === 2) {
            expect(result).toMatchSnapshot('result props');
            setTimeout(() => load());
          } else if (count === 3) {
            expect(result).toEqual({
              loading: true,
              called: true,
            });
            done();
          }

          count++;
        });

        return null;
      }}
    </AllPeopleQuery>
  );

  const mockError = [
    {
      request: { query: allPeopleQuery },
      error: new Error('error'),
    },
  ];

  mount(
    <MockedProvider mocks={mockError} addTypename={false}>
      <Component />
    </MockedProvider>,
  );
});
