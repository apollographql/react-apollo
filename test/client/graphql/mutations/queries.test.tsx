import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient, { MutationUpdaterFn } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql, ChildProps } from '../../../../src';
import stripSymbols from '../../../test-utils/stripSymbols';
import createClient from '../../../test-utils/createClient';
import { DocumentNode } from 'graphql';

describe('graphql(mutation) query integration', () => {
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
        completed: true,
      },
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
              completed: true,
            },
          };
          this.props.mutate!({ optimisticResponse }).then(result => {
            expect(stripSymbols(result.data)).toEqual(data);
            done();
          });

          const dataInStore = client.cache.extract(true);
          expect(stripSymbols(dataInStore['Todo:99'])).toEqual(optimisticResponse.createTodo);
        }
        render() {
          return null;
        }
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
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
        completed: true,
      },
    };

    type MutationData = typeof mutationData;

    const optimisticResponse = {
      createTodo: {
        id: '99',
        text: 'Optimistically generated',
        completed: true,
      },
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
      todo_list: { id: '123', title: 'how to apollo', tasks: [] },
    };

    const link = mockSingleLink(
      {
        request: { query },
        result: { data: expectedData },
      },
      { request: { query: mutation }, result: { data: mutationData } },
    );
    const cache = new Cache({ addTypename: false });
    const client = new ApolloClient({ link, cache });

    const withQuery = graphql<{}, QueryData>(query);

    type WithQueryChildProps = ChildProps<{}, QueryData>;
    const withMutation = graphql<WithQueryChildProps, MutationData>(mutation, {
      options: () => ({ optimisticResponse, update }),
    });

    let count = 0;

    type ContainerProps = ChildProps<WithQueryChildProps, MutationData>;
    class Container extends React.Component<ContainerProps> {
      componentWillReceiveProps(props: ContainerProps) {
        if (!props.data || !props.data.todo_list) return;
        if (!props.data.todo_list.tasks.length) {
          props.mutate!().then(result => {
            expect(stripSymbols(result.data)).toEqual(mutationData);
          });

          const dataInStore = cache.extract(true);
          expect(stripSymbols(dataInStore['$ROOT_MUTATION.createTodo'])).toEqual(
            optimisticResponse.createTodo,
          );
          return;
        }

        if (count === 0) {
          count++;
          expect(stripSymbols(props.data.todo_list.tasks)).toEqual([optimisticResponse.createTodo]);
        } else if (count === 1) {
          expect(stripSymbols(props.data.todo_list.tasks)).toEqual([mutationData.createTodo]);
          done();
        }
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withQuery(withMutation(Container));

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
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
        cover: 'image1',
      },
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
        __typename: 'Mini',
      },
    };

    type MutationData = typeof mutationData;

    interface MutationVariables {
      signature: string;
    }

    const link = mockSingleLink(
      { request: { query, variables }, result: { data: queryData } },
      {
        request: { query: mutation, variables: { signature: '1233' } },
        result: { data: mutationData },
      },
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
    const MutationContainer = graphql<MutationVariables, MutationData>(mutation)(
      class extends React.Component<ChildProps<MutationVariables, MutationData>> {
        componentWillReceiveProps(props: ChildProps<MutationVariables, MutationData>) {
          if (count === 1) {
            props.mutate!().then(result => {
              expect(stripSymbols(result.data)).toEqual(mutationData);
            });
          }
        }
        render() {
          return null;
        }
      },
    );

    const Container = graphql<Variables, Data>(query)(
      class extends React.Component<ChildProps<Variables, Data>> {
        componentWillReceiveProps(props: ChildProps<Variables, Data>) {
          if (count === 0) {
            expect(stripSymbols(props.data!.mini)).toEqual(queryData.mini);
          }
          if (count === 1) {
            expect(stripSymbols(props.data!.mini)).toEqual(mutationData.mini);
            done();
          }
          count++;
        }
        render() {
          return <MutationContainer {...this.props.data!.mini} signature="1233" />;
        }
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Boundary>
          <Container id={1} />
        </Boundary>
      </ApolloProvider>,
    );
  });
  // this test is flaky, find out why and turn it back on
  xit('handles refetchingQueries after a mutation', done => {
    // reproduction of query from Apollo Engine
    const accountId = '1234';

    const billingInfoQuery: DocumentNode = gql`
      query Account__PaymentDetailQuery($accountId: ID!) {
        account(id: $accountId) {
          id
          currentPlan {
            id
            name
          }
        }
      }
    `;

    const overlappingQuery: DocumentNode = gql`
      query Account__PaymentQuery($accountId: ID!) {
        account(id: $accountId) {
          id
          currentPlan {
            id
            name
          }
        }
      }
    `;

    const data1 = {
      account: {
        id: accountId,
        currentPlan: {
          id: 'engine-77',
          name: 'Utility',
        },
      },
    };
    const data2 = {
      account: {
        id: accountId,
        currentPlan: {
          id: 'engine-78',
          name: 'Free',
        },
      },
    };

    type QueryData = typeof data1;

    interface QueryVariables {
      accountId: string;
    }

    const setPlanMutation: DocumentNode = gql`
      mutation Account__SetPlanMutation($accountId: ID!, $planId: ID!) {
        accountSetPlan(accountId: $accountId, planId: $planId)
      }
    `;

    const mutationData = {
      accountSetPlan: true,
    };

    type MutationData = typeof mutationData;

    interface MutationVariables {
      accountId: string;
      planId: string;
    }

    const variables = {
      accountId,
    };

    const link = mockSingleLink(
      {
        request: { query: billingInfoQuery, variables },
        result: { data: data1 },
      },
      {
        request: { query: overlappingQuery, variables },
        result: { data: data1 },
      },
      {
        request: {
          query: setPlanMutation,
          variables: { accountId, planId: 'engine-78' },
        },
        result: { data: mutationData },
      },
      {
        request: { query: billingInfoQuery, variables },
        result: { data: data2 },
      },
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

    let refetched = false;
    class RelatedUIComponent extends React.Component<ChildProps<{}, QueryData, QueryVariables>> {
      componentWillReceiveProps(props: ChildProps<{}, QueryData, QueryVariables>) {
        if (refetched) {
          expect(props.data!.account!.currentPlan.name).toBe('Free');
          done();
        }
      }
      render() {
        return this.props.children;
      }
    }

    const RelatedUIComponentWithData = graphql<{}, QueryData, QueryVariables>(overlappingQuery, {
      options: { variables: { accountId } },
    })(RelatedUIComponent);

    const withQuery = graphql<{}, QueryData, QueryVariables>(billingInfoQuery, {
      options: { variables: { accountId } },
    });
    type WithQueryChildProps = ChildProps<{}, QueryData, QueryVariables>;

    const withMutation = graphql<WithQueryChildProps, MutationData, MutationVariables>(
      setPlanMutation,
    );
    type WithMutationChildProps = ChildProps<WithQueryChildProps, MutationData, MutationVariables>;

    let count = 0;
    class PaymentDetail extends React.Component<WithMutationChildProps> {
      componentWillReceiveProps(props: WithMutationChildProps) {
        if (count === 1) {
          expect(props.data!.account!.currentPlan.name).toBe('Free');
          done();
        }
        count++;
      }
      async onPaymentInfoChanged() {
        try {
          refetched = true;
          await this.props.mutate!({
            refetchQueries: [
              {
                query: billingInfoQuery,
                variables: {
                  accountId,
                },
              },
            ],
            variables: {
              accountId,
              planId: 'engine-78',
            },
          });
        } catch (e) {
          done.fail(e);
        }
      }

      componentDidMount() {
        setTimeout(() => {
          // trigger mutation and future updates
          this.onPaymentInfoChanged();
        }, 10);
      }

      render() {
        return null;
      }
    }

    const PaymentDetailWithData = withQuery(withMutation(PaymentDetail));

    renderer.create(
      <ApolloProvider client={client}>
        <Boundary>
          <RelatedUIComponentWithData>
            <PaymentDetailWithData />
          </RelatedUIComponentWithData>
        </Boundary>
      </ApolloProvider>,
    );
  });
});
