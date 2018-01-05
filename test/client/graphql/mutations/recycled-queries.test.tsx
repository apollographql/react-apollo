import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';
import stripSymbols from '../../../test-utils/stripSymbols';

describe('graphql(mutation) update queries', () => {
  // This is a long test that keeps track of a lot of stuff. It is testing
  // whether or not the `options.update` reducers will run even when a given
  // container component is unmounted.
  //
  // It does this with the following procedure:
  //
  // 1. Mount a mutation component.
  // 2. Mount a query component.
  // 3. Run the mutation in the mutation component.
  // 4. Check the props in the query component.
  // 5. Unmount the query component.
  // 6. Run the mutation in the mutation component again.
  // 7. Remount the query component.
  // 8. Check the props in the query component to confirm that the mutation
  //    that was run while we were unmounted changed the query component’s
  //    props.
  //
  // There are also a lot more assertions on the way to make sure everything is
  // going as smoothly as planned.
  it('will run `update` for a previously mounted component', () =>
    new Promise((resolve, reject) => {
      const query = gql`
        query todos {
          todo_list {
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

      let todoUpdateQueryCount = 0;
      const update = (proxy, { data: { createTodo } }) => {
        todoUpdateQueryCount++;
        const data = proxy.readQuery({ query }); // read from cache
        data.todo_list.tasks.push(createTodo); // update value
        proxy.writeQuery({ query, data }); // write to cache
      };

      const expectedData = {
        todo_list: { id: '123', title: 'how to apollo', tasks: [] },
      };

      const link = mockSingleLink(
        {
          request: { query },
          result: { data: expectedData },
        },
        { request: { query: mutation }, result: { data: mutationData } },
        { request: { query: mutation }, result: { data: mutationData } },
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      let mutate;

      @graphql(mutation, { options: () => ({ update }) })
      class MyMutation extends React.Component<any, any> {
        componentDidMount() {
          mutate = this.props.mutate;
        }

        render() {
          return null;
        }
      }

      let queryMountCount = 0;
      let queryUnmountCount = 0;
      let queryRenderCount = 0;

      @graphql(query)
      class MyQuery extends React.Component<any, any> {
        componentWillMount() {
          queryMountCount++;
        }

        componentWillUnmount() {
          queryUnmountCount++;
        }

        render() {
          try {
            switch (queryRenderCount++) {
              case 0:
                expect(this.props.data.loading).toBeTruthy();
                expect(this.props.data.todo_list).toBeFalsy();
                break;
              case 1:
                expect(stripSymbols(this.props.data.todo_list)).toEqual({
                  id: '123',
                  title: 'how to apollo',
                  tasks: [],
                });
                break;
              case 2:
                expect(queryMountCount).toBe(1);
                expect(queryUnmountCount).toBe(0);
                expect(stripSymbols(this.props.data.todo_list)).toEqual({
                  id: '123',
                  title: 'how to apollo',
                  tasks: [
                    {
                      id: '99',
                      text: 'This one was created with a mutation.',
                      completed: true,
                    },
                  ],
                });
                break;
              case 3:
                expect(queryMountCount).toBe(2);
                expect(queryUnmountCount).toBe(1);
                expect(stripSymbols(this.props.data.todo_list)).toEqual({
                  id: '123',
                  title: 'how to apollo',
                  tasks: [
                    {
                      id: '99',
                      text: 'This one was created with a mutation.',
                      completed: true,
                    },
                    {
                      id: '99',
                      text: 'This one was created with a mutation.',
                      completed: true,
                    },
                  ],
                });
                break;
              case 4:
                expect(stripSymbols(this.props.data.todo_list)).toEqual({
                  id: '123',
                  title: 'how to apollo',
                  tasks: [
                    {
                      id: '99',
                      text: 'This one was created with a mutation.',
                      completed: true,
                    },
                    {
                      id: '99',
                      text: 'This one was created with a mutation.',
                      completed: true,
                    },
                  ],
                });
                break;
              default:
                throw new Error('Rendered too many times');
            }
          } catch (error) {
            reject(error);
          }
          return null;
        }
      }

      const wrapperMutation = renderer.create(
        <ApolloProvider client={client}>
          <MyMutation />
        </ApolloProvider>,
      );

      const wrapperQuery1 = renderer.create(
        <ApolloProvider client={client}>
          <MyQuery />
        </ApolloProvider>,
      );

      setTimeout(() => {
        mutate();

        setTimeout(() => {
          try {
            expect(queryUnmountCount).toBe(0);
            wrapperQuery1.unmount();
            expect(queryUnmountCount).toBe(1);
          } catch (error) {
            reject(error);
            throw error;
          }

          setTimeout(() => {
            mutate();

            setTimeout(() => {
              const wrapperQuery2 = renderer.create(
                <ApolloProvider client={client}>
                  <MyQuery id="123" />
                </ApolloProvider>,
              );

              setTimeout(() => {
                wrapperMutation.unmount();
                wrapperQuery2.unmount();

                try {
                  expect(todoUpdateQueryCount).toBe(2);
                  expect(queryMountCount).toBe(2);
                  expect(queryUnmountCount).toBe(2);
                  expect(queryRenderCount).toBe(5);
                  resolve();
                } catch (error) {
                  reject(error);
                  throw error;
                }
              }, 5);
            }, 5);
          }, 5);
        }, 6);
      }, 5);
    }));

  it('will run `refetchQueries` for a recycled queries', () =>
    new Promise((resolve, reject) => {
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

      const updatedData = {
        todo_list: {
          id: '123',
          title: 'how to apollo',
          tasks: [mutationData.createTodo],
        },
      };

      const link = mockSingleLink(
        { request: { query, variables: { id: '123' } }, result: { data } },
        { request: { query: mutation }, result: { data: mutationData } },
        {
          request: { query, variables: { id: '123' } },
          result: { data: updatedData },
        },
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      let mutate;

      @graphql(mutation, {})
      class Mutation extends React.Component<any, any> {
        componentDidMount() {
          mutate = this.props.mutate;
        }

        render() {
          return null;
        }
      }

      let queryMountCount = 0;
      let queryUnmountCount = 0;
      let queryRenderCount = 0;

      @graphql(query)
      class Query extends React.Component<any, any> {
        componentWillMount() {
          queryMountCount++;
        }

        componentWillUnmount() {
          queryUnmountCount++;
        }

        render() {
          try {
            switch (queryRenderCount++) {
              case 0:
                expect(this.props.data.loading).toBeTruthy();
                expect(this.props.data.todo_list).toBeFalsy();
                break;
              case 1:
                expect(this.props.data.loading).toBeFalsy();
                expect(stripSymbols(this.props.data.todo_list)).toEqual({
                  id: '123',
                  title: 'how to apollo',
                  tasks: [],
                });
                break;
              case 2:
                expect(queryMountCount).toBe(2);
                expect(queryUnmountCount).toBe(1);
                expect(stripSymbols(this.props.data.todo_list)).toEqual(
                  updatedData.todo_list,
                );
                break;
              case 3:
                expect(queryMountCount).toBe(2);
                expect(queryUnmountCount).toBe(1);
                expect(stripSymbols(this.props.data.todo_list)).toEqual(
                  updatedData.todo_list,
                );
                break;
              default:
                throw new Error('Rendered too many times');
            }
          } catch (error) {
            reject(error);
          }
          return null;
        }
      }

      renderer.create(
        <ApolloProvider client={client}>
          <Mutation />
        </ApolloProvider>,
      );

      const wrapperQuery1 = renderer.create(
        <ApolloProvider client={client}>
          <Query id="123" />
        </ApolloProvider>,
      );

      setTimeout(() => {
        wrapperQuery1.unmount();

        mutate({ refetchQueries: ['todos'] })
          .then((...args) => {
            setTimeout(() => {
              // This re-renders the recycled query that should have been refetched while recycled.
              renderer.create(
                <ApolloProvider client={client}>
                  <Query id="123" />
                </ApolloProvider>,
              );
              resolve();
            }, 5);
          })
          .catch(error => {
            reject(error);
            throw error;
          });
      }, 5);
    }));
});
