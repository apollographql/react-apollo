import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient, { MutationUpdaterFn } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import {
  mockSingleLink,
  stripSymbols,
  createClient
} from '@apollo/react-testing';
import { DocumentNode } from 'graphql';
import { ApolloProvider } from '@apollo/react-common';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('graphql(mutation) query integration', () => {
  afterEach(cleanup);

  it('allows for passing optimisticResponse for a mutation', done => {
    const query: DocumentNode = gql`
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
        completed: true
      }
    };

    type Data = typeof data;

    const client = createClient(data, query);
    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidMount() {
          const optimisticResponse = {
            __typename: 'Mutation',
            createTodo: {
              __typename: 'Todo',
              id: '99',
              text: 'Optimistically generated',
              completed: true
            }
          };
          this.props.mutate!({ optimisticResponse }).then(result => {
            expect(stripSymbols(result && result.data)).toEqual(data);
            done();
          });

          const dataInStore = client.cache.extract(true);
          expect(stripSymbols(dataInStore['Todo:99'])).toEqual(
            optimisticResponse.createTodo
          );
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });

  it('allows for updating queries from a mutation', done => {
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

    const optimisticResponse = {
      createTodo: {
        id: '99',
        text: 'Optimistically generated',
        completed: true
      }
    };
    interface QueryData {
      todo_list: {
        id: string;
        title: string;
        tasks: { id: string; text: string; completed: boolean }[];
      };
    }

    const update: MutationUpdaterFn = (proxy, result) => {
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
      { request: { query: mutation }, result: { data: mutationData } }
    );
    const cache = new Cache({ addTypename: false });
    const client = new ApolloClient({ link, cache });

    const withQuery = graphql<{}, QueryData>(query);

    type WithQueryChildProps = ChildProps<{}, QueryData>;
    const withMutation = graphql<WithQueryChildProps, MutationData>(mutation, {
      options: () => ({ optimisticResponse, update })
    });

    let count = 0;

    type ContainerProps = ChildProps<WithQueryChildProps, MutationData>;
    class Container extends React.Component<ContainerProps> {
      render() {
        if (!this.props.data || !this.props.data.todo_list) return null;
        if (!this.props.data.todo_list.tasks.length) {
          this.props.mutate!().then(result => {
            expect(stripSymbols(result && result.data)).toEqual(mutationData);
          });

          const dataInStore = cache.extract(true);
          expect(
            stripSymbols(dataInStore['$ROOT_MUTATION.createTodo'])
          ).toEqual(optimisticResponse.createTodo);
          return null;
        }

        if (count === 0) {
          count++;
          expect(stripSymbols(this.props.data.todo_list.tasks)).toEqual([
            optimisticResponse.createTodo
          ]);
        } else if (count === 1) {
          expect(stripSymbols(this.props.data.todo_list.tasks)).toEqual([
            mutationData.createTodo
          ]);
          done();
        }

        return null;
      }
    }

    const ContainerWithData = withQuery(withMutation(Container));

    render(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>
    );
  });

  it('allows for updating queries from a mutation automatically', done => {
    const query: DocumentNode = gql`
      query getMini($id: ID!) {
        mini(id: $id) {
          __typename
          id
          cover(maxWidth: 600, maxHeight: 400)
        }
      }
    `;

    const queryData = {
      mini: {
        id: 1,
        __typename: 'Mini',
        cover: 'image1'
      }
    };

    type Data = typeof queryData;

    const variables = { id: 1 };

    type Variables = typeof variables;

    const mutation: DocumentNode = gql`
      mutation($signature: String!) {
        mini: submitMiniCoverS3DirectUpload(signature: $signature) {
          __typename
          id
          cover(maxWidth: 600, maxHeight: 400)
        }
      }
    `;

    const mutationData = {
      mini: {
        id: 1,
        cover: 'image2',
        __typename: 'Mini'
      }
    };

    type MutationData = typeof mutationData;

    interface MutationVariables {
      signature: string;
    }

    const link = mockSingleLink(
      { request: { query, variables }, result: { data: queryData } },
      {
        request: { query: mutation, variables: { signature: '1233' } },
        result: { data: mutationData }
      }
    );
    const cache = new Cache({ addTypename: false });
    const client = new ApolloClient({ link, cache });

    class Boundary extends React.Component {
      componentDidCatch(e: any) {
        done.fail(e);
      }
      render() {
        return this.props.children;
      }
    }

    let count = 0;
    const MutationContainer = graphql<MutationVariables, MutationData>(
      mutation
    )(
      class extends React.Component<
        ChildProps<MutationVariables, MutationData>
      > {
        render() {
          if (count === 1) {
            this.props.mutate!()
              .then(result => {
                expect(stripSymbols(result && result.data)).toEqual(
                  mutationData
                );
              })
              .catch(done.fail);
          }
          return null;
        }
      }
    );

    const Container = graphql<Variables, Data>(query)(
      class extends React.Component<ChildProps<Variables, Data>> {
        render() {
          if (count === 1) {
            expect(stripSymbols(this.props.data!.mini)).toEqual(queryData.mini);
          }
          if (count === 2) {
            expect(stripSymbols(this.props.data!.mini)).toEqual(
              mutationData.mini
            );
            done();
          }
          count++;

          return (
            <MutationContainer {...this.props.data!.mini} signature="1233" />
          );
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Boundary>
          <Container id={1} />
        </Boundary>
      </ApolloProvider>
    );
  });
});
