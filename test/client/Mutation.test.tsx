import * as React from 'react';
import { mount } from 'enzyme';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';

import { ApolloProvider, Mutation, Query } from '../../src';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';

import stripSymbols from '../test-utils/stripSymbols';

const mutation = gql`
  mutation createTodo($text: String!) {
    createTodo {
      id
      text
      completed
      __typename
    }
    __typename
  }
`;

const data = {
  createTodo: {
    __typename: 'Todo',
    id: '99',
    text: 'This one was created with a mutation.',
    completed: true,
  },
  __typename: 'Mutation',
};

const variables = {
  text: 'play tennis',
};

const mocks = [
  {
    request: { query: mutation, variables },
    result: { data },
  },
];

const cache = new Cache({ addTypename: false });

it('performs a mutation', done => {
  let count = 0;
  const Component = () => (
    <Mutation mutation={mutation} variables={variables}>
      {(createTodo, result) => {
        if (count === 0) {
          expect(result).toBeUndefined();
          setTimeout(() => {
            createTodo();
          });
        } else if (count === 1) {
          expect(result).toEqual({
            loading: true,
          });
        } else if (count === 2) {
          expect(result).toEqual({
            loading: false,
            data,
          });
          done();
        }
        count++;
        return <div />;
      }}
    </Mutation>
  );

  mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
});

it('renders result of the children render prop', () => {
  const Component = () => (
    <Mutation mutation={mutation} variables={variables}>
      {(createTodo, result) => {
        return <div />;
      }}
    </Mutation>
  );

  const wrapper = mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
  expect(wrapper.find('div').exists()).toBe(true);
});

it('renders an error state', done => {
  let count = 0;
  const Component = () => (
    <Mutation mutation={mutation}>
      {(createTodo, result) => {
        if (count === 0) {
          setTimeout(() => {
            createTodo();
          });
        } else if (count === 1) {
          expect(result.loading).toBeTruthy();
        } else if (count === 2) {
          expect(result.error).toEqual(
            new Error('Network error: error occurred'),
          );
          done();
        }
        count++;
        return <div />;
      }}
    </Mutation>
  );

  const mockError = [
    {
      request: { query: mutation },
      error: new Error('error occurred'),
    },
  ];

  mount(
    <MockedProvider mocks={mockError}>
      <Component />
    </MockedProvider>,
  );
});

it('returns an optimistic response', done => {
  const link = mockSingleLink(...mocks);
  const client = new ApolloClient({
    link,
    cache,
  });

  const optimisticResponse = {
    createTodo: {
      id: '99',
      text: 'This is an optimistic response',
      completed: false,
      __typename: 'Todo',
    },
    __typename: 'Mutation',
  };

  let count = 0;
  const Component = () => (
    <Mutation
      mutation={mutation}
      variables={variables}
      optimisticResponse={optimisticResponse}
    >
      {(createTodo, result) => {
        if (count === 0) {
          expect(result).toBeUndefined();
          setTimeout(() => {
            createTodo();
            const dataInStore = client.cache.extract(true);
            expect(dataInStore['Todo:99']).toEqual(
              optimisticResponse.createTodo,
            );
          });
        } else if (count === 1) {
          expect(result).toEqual({
            loading: true,
          });
        } else if (count === 2) {
          expect(result).toEqual({
            loading: false,
            data,
          });
          done();
        }
        count++;
        return <div />;
      }}
    </Mutation>
  );

  mount(
    <ApolloProvider client={client}>
      <Component />
    </ApolloProvider>,
  );
});

it('has refetchQueries in the props', done => {
  const query = gql`
    query getTodo {
      todo {
        id
        text
        completed
        __typename
      }
      __typename
    }
  `;

  const queryData = {
    todo: {
      id: '1',
      text: 'todo from query',
      completed: false,
      __typename: 'Todo',
    },
    __typename: 'Query',
  };

  const mocksWithQuery = [
    ...mocks,
    // TODO: Somehow apollo-client makes 3 request
    // when refetch queries is enabled??
    {
      request: { query },
      result: { data: queryData },
    },
    {
      request: { query },
      result: { data: queryData },
    },
    {
      request: { query },
      result: { data: queryData },
    },
  ];

  const refetchQueries = [
    {
      query,
    },
  ];

  let count = 0;
  const Component = () => (
    <Mutation
      mutation={mutation}
      variables={variables}
      refetchQueries={refetchQueries}
    >
      {(createTodo, resultMutation) => (
        <Query query={query}>
          {resultQuery => {
            if (count === 0) {
              setTimeout(() => {
                createTodo();
              });
            } else if (count === 1) {
              expect(resultMutation.loading).toBe(true);
              expect(resultQuery.loading).toBe(true);
            } else if (count === 2) {
              expect(resultMutation.loading).toBe(true);
              expect(stripSymbols(resultQuery.data)).toEqual(queryData);
              done();
            }
            count++;
            return null;
          }}
        </Query>
      )}
    </Mutation>
  );

  mount(
    <MockedProvider mocks={mocksWithQuery}>
      <Component />
    </MockedProvider>,
  );
});

it('has an update prop for updating the store after the mutation', done => {
  const update = (proxy, response) => {
    expect(response.data).toEqual(data);
    done();
  };

  let count = 0;
  const Component = () => (
    <Mutation mutation={mutation} variables={variables} update={update}>
      {(createTodo, result) => {
        if (count === 0) {
          setTimeout(() => {
            createTodo();
          });
        }
        count++;
        return null;
      }}
    </Mutation>
  );

  mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
});
