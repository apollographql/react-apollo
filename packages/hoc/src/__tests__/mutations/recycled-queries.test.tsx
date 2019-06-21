import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient, { MutationUpdaterFn } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider, MutationFunction } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('graphql(mutation) update queries', () => {
  afterEach(cleanup);

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
      const query: DocumentNode = gql`
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

      interface QueryData {
        todo_list: {
          id: string;
          title: string;
          tasks: { id: string; text: string; completed: boolean }[];
        };
      }

      const mutation: DocumentNode = gql`
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
          completed: true
        }
      };
      type MutationData = typeof mutationData;

      let todoUpdateQueryCount = 0;
      const update: MutationUpdaterFn = (proxy, result) => {
        todoUpdateQueryCount++;
        const data = proxy.readQuery<QueryData>({ query }); // read from cache
        data!.todo_list.tasks.push(result.data!.createTodo); // update value
        proxy.writeQuery({ query, data }); // write to cache
      };

      const expectedData = {
        todo_list: { id: '123', title: 'how to apollo', tasks: [] }
      };

      const link = mockSingleLink(
        {
          request: { query },
          result: { data: expectedData }
        },
        { request: { query: mutation }, result: { data: mutationData } },
        { request: { query: mutation }, result: { data: mutationData } }
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false })
      });

      let mutate: MutationFunction<MutationData>;

      const MyMutation = graphql<{}, MutationData>(mutation, {
        options: () => ({ update })
      })(
        class extends React.Component<ChildProps<{}, MutationData>> {
          componentDidMount() {
            mutate = this.props.mutate!;
          }

          render() {
            return null;
          }
        }
      );

      let queryMountCount = 0;
      let queryUnmountCount = 0;
      let queryRenderCount = 0;

      const MyQuery = graphql<{}, QueryData>(query)(
        class extends React.Component<ChildProps<{}, QueryData>> {
          componentDidMount() {
            queryMountCount++;
          }

          componentWillUnmount() {
            queryUnmountCount++;
          }

          render() {
            try {
              switch (queryRenderCount) {
                case 0:
                  expect(this.props.data!.loading).toBeTruthy();
                  expect(this.props.data!.todo_list).toBeFalsy();
                  break;
                case 1:
                  expect(stripSymbols(this.props.data!.todo_list)).toEqual({
                    id: '123',
                    title: 'how to apollo',
                    tasks: []
                  });
                  break;
                case 2:
                  expect(queryMountCount).toBe(1);
                  expect(queryUnmountCount).toBe(1);
                  expect(stripSymbols(this.props.data!.todo_list)).toEqual({
                    id: '123',
                    title: 'how to apollo',
                    tasks: [
                      {
                        id: '99',
                        text: 'This one was created with a mutation.',
                        completed: true
                      },
                      {
                        id: '99',
                        text: 'This one was created with a mutation.',
                        completed: true
                      }
                    ]
                  });
                  break;
                case 3:
                  expect(stripSymbols(this.props.data!.todo_list)).toEqual({
                    id: '123',
                    title: 'how to apollo',
                    tasks: [
                      {
                        id: '99',
                        text: 'This one was created with a mutation.',
                        completed: true
                      },
                      {
                        id: '99',
                        text: 'This one was created with a mutation.',
                        completed: true
                      }
                    ]
                  });
                  break;
                default:
                  throw new Error('Rendered too many times');
              }
              queryRenderCount += 1;
            } catch (error) {
              reject(error);
            }
            return null;
          }
        }
      );

      const { unmount: mutationUnmount } = render(
        <ApolloProvider client={client}>
          <MyMutation />
        </ApolloProvider>
      );

      const { unmount: query1Unmount } = render(
        <ApolloProvider client={client}>
          <MyQuery />
        </ApolloProvider>
      );

      setTimeout(() => {
        mutate();

        setTimeout(() => {
          try {
            expect(queryUnmountCount).toBe(0);
            query1Unmount();
            expect(queryUnmountCount).toBe(1);
          } catch (error) {
            reject(error);
            throw error;
          }

          setTimeout(() => {
            mutate();

            setTimeout(() => {
              const { unmount: query2Unmount } = render(
                <ApolloProvider client={client}>
                  <MyQuery />
                </ApolloProvider>
              );

              resolve();

              setTimeout(() => {
                mutationUnmount();
                query2Unmount();

                try {
                  expect(todoUpdateQueryCount).toBe(2);
                  expect(queryMountCount).toBe(2);
                  expect(queryUnmountCount).toBe(2);
                  expect(queryRenderCount).toBe(3);
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
      const mutation: DocumentNode = gql`
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
          completed: true
        }
      };

      type MutationData = typeof mutationData;

      const query: DocumentNode = gql`
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

      interface QueryData {
        todo_list: {
          id: string;
          title: string;
          tasks: { id: string; text: string; completed: boolean }[];
        };
      }

      interface QueryVariables {
        id: string;
      }

      const data = {
        todo_list: { id: '123', title: 'how to apollo', tasks: [] }
      };

      const updatedData = {
        todo_list: {
          id: '123',
          title: 'how to apollo',
          tasks: [mutationData.createTodo]
        }
      };

      const link = mockSingleLink(
        { request: { query, variables: { id: '123' } }, result: { data } },
        { request: { query: mutation }, result: { data: mutationData } },
        {
          request: { query, variables: { id: '123' } },
          result: { data: updatedData }
        }
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false })
      });

      let mutate: MutationFunction<MutationData>;

      const Mutation = graphql<{}, MutationData>(mutation)(
        class extends React.Component<ChildProps<{}, MutationData>> {
          componentDidMount() {
            mutate = this.props.mutate!;
          }

          render() {
            return null;
          }
        }
      );

      let queryMountCount = 0;
      let queryUnmountCount = 0;
      let queryRenderCount = 0;

      const Query = graphql<QueryVariables, QueryData, QueryVariables>(query)(
        class extends React.Component<
          ChildProps<QueryVariables, QueryData, QueryVariables>
        > {
          componentDidMount() {
            queryMountCount++;
          }

          componentWillUnmount() {
            queryUnmountCount++;
          }

          render() {
            try {
              switch (queryRenderCount++) {
                case 0:
                  expect(this.props.data!.loading).toBeTruthy();
                  expect(this.props.data!.todo_list).toBeFalsy();
                  break;
                case 1:
                  expect(this.props.data!.loading).toBeFalsy();
                  expect(stripSymbols(this.props.data!.todo_list)).toEqual({
                    id: '123',
                    title: 'how to apollo',
                    tasks: []
                  });
                  break;
                case 2:
                  expect(queryMountCount).toBe(1);
                  // expect(queryUnmountCount).toBe(1);
                  expect(stripSymbols(this.props.data!.todo_list)).toEqual(
                    updatedData.todo_list
                  );
                  break;
                case 3:
                  // expect(queryMountCount).toBe(2);
                  // expect(queryUnmountCount).toBe(1);
                  expect(stripSymbols(this.props.data!.todo_list)).toEqual(
                    updatedData.todo_list
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
      );

      render(
        <ApolloProvider client={client}>
          <Mutation />
        </ApolloProvider>
      );

      render(
        <ApolloProvider client={client}>
          <Query id="123" />
        </ApolloProvider>
      );

      setTimeout(() => {
        mutate({ refetchQueries: [{ query, variables: { id: '123' } }] })
          .then(() => {
            setTimeout(() => {
              // This re-renders the recycled query that should have been refetched while recycled.
              render(
                <ApolloProvider client={client}>
                  <Query id="123" />
                </ApolloProvider>
              );
              resolve();
            }, 5);
          })
          .catch((error: any) => {
            reject(error);
            throw error;
          });
      }, 5);
    }));
});
