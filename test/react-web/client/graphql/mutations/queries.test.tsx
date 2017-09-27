import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import assign = require('object-assign');

import ApolloClient from 'apollo-client';
import Cache from 'apollo-cache-inmemory';

declare function require(name: string);

import { mockSingleLink } from '../../../../../src/test-utils';

import { ApolloProvider, graphql } from '../../../../../src';

describe('[mutations] query integration', () => {
  it('allows for passing optimisticResponse for a mutation', done => {
    const query = gql`
      mutation createTodo {
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
      __typename: 'Mutation',
      createTodo: {
        __typename: 'Todo',
        id: '99',
        text: 'This one was created with a mutation.',
        completed: true,
      },
    };

    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const cache = new Cache({ addTypename: false });
    const client = new ApolloClient({ link, cache });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        const optimisticResponse = {
          __typename: 'Mutation',
          createTodo: {
            __typename: 'Todo',
            id: '99',
            text: 'Optimistically generated',
            completed: true,
          },
        };
        this.props.mutate({ optimisticResponse }).then(result => {
          expect(result.data).toEqual(data);
          done();
        });

        const dataInStore = cache.extract(true);
        expect(dataInStore['Todo:99']).toEqual(optimisticResponse.createTodo);
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('allows for updating queries from a mutation', done => {
    const mutation = gql`
      mutation createTodo {
        createTodo {
          id
          text
          completed
        }
      }
    `;

    const mutationData = {
      createTodo: {
        id: '99',
        text: 'This one was created with a mutation.',
        completed: true,
      },
    };

    const optimisticResponse = {
      createTodo: {
        id: '99',
        text: 'Optimistically generated',
        completed: true,
      },
    };

    const updateQueries = {
      todos: (previousQueryResult, { mutationResult, queryVariables }) => {
        if (queryVariables.id !== '123') {
          // this isn't the query we updated, so just return the previous result
          return previousQueryResult;
        }
        // otherwise, create a new object with the same shape as the
        // previous result with the mutationResult incorporated
        const originalList = previousQueryResult.todo_list;
        const newTask = mutationResult.data.createTodo;
        return {
          todo_list: assign(originalList, {
            tasks: [...originalList.tasks, newTask],
          }),
        };
      },
    };

    const query = gql`
      query todos($id: ID!) {
        todo_list(id: $id) {
          id
          title
          tasks {
            id
            text
            completed
          }
        }
      }
    `;

    const data = {
      todo_list: { id: '123', title: 'how to apollo', tasks: [] },
    };

    const link = mockSingleLink(
      { request: { query, variables: { id: '123' } }, result: { data } },
      { request: { query: mutation }, result: { data: mutationData } },
    );
    const cache = new Cache({ addTypename: false });
    const client = new ApolloClient({ link, cache });

    let count = 0;
    @graphql(query)
    @graphql(mutation, {
      options: () => ({ optimisticResponse, updateQueries }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (!props.data.todo_list) return;
        if (!props.data.todo_list.tasks.length) {
          props.mutate().then(result => {
            expect(result.data).toEqual(mutationData);
          });

          const dataInStore = cache.extract(true);
          expect(dataInStore['$ROOT_MUTATION.createTodo']).toEqual(
            optimisticResponse.createTodo,
          );
          return;
        }

        if (count === 0) {
          count++;
          expect(props.data.todo_list.tasks).toEqual([
            optimisticResponse.createTodo,
          ]);
        } else if (count === 1) {
          expect(props.data.todo_list.tasks).toEqual([mutationData.createTodo]);
          done();
        }
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container id={'123'} />
      </ApolloProvider>,
    );
  });
});
