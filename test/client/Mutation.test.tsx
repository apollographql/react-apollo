import * as React from 'react';
import { mount } from 'enzyme';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider, Mutation } from '../../src';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';
import gql from 'graphql-tag';

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
