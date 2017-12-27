import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import {
  ApolloProvider,
  graphql,
  compose,
  ChildProps,
  MutationFunc,
} from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';

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
          expect(stripSymbols(result.data)).toEqual(data);
          done();
        });

        const dataInStore = cache.extract(true);
        expect(stripSymbols(dataInStore['Todo:99'])).toEqual(
          optimisticResponse.createTodo,
        );
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
          todo_list: Object.assign(originalList, {
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
            expect(stripSymbols(result.data)).toEqual(mutationData);
          });

          const dataInStore = cache.extract(true);
          expect(
            stripSymbols(dataInStore['$ROOT_MUTATION.createTodo']),
          ).toEqual(optimisticResponse.createTodo);
          return;
        }

        if (count === 0) {
          count++;
          expect(stripSymbols(props.data.todo_list.tasks)).toEqual([
            optimisticResponse.createTodo,
          ]);
        } else if (count === 1) {
          expect(stripSymbols(props.data.todo_list.tasks)).toEqual([
            mutationData.createTodo,
          ]);
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
  it('allows for updating queries from a mutation automatically', done => {
    const query = gql`
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

    const variables = { id: 1 };

    const mutation = gql`
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
      componentDidCatch(e) {
        done.fail(e);
      }
      render() {
        return this.props.children;
      }
    }

    let count = 0;
    @graphql(mutation)
    class MutationContainer extends React.Component {
      componentWillReceiveProps(props) {
        if (count === 1) {
          props.mutate().then(result => {
            expect(stripSymbols(result.data)).toEqual(mutationData);
          });
        }
      }
      render() {
        return null;
      }
    }

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (count === 0) {
          expect(stripSymbols(props.data.mini)).toEqual(queryData.mini);
        }
        if (count === 1) {
          expect(stripSymbols(props.data.mini)).toEqual(mutationData.mini);
          done();
        }
        count++;
      }
      render() {
        return <MutationContainer {...this.props.data.mini} signature="1233" />;
      }
    }

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

    const billingInfoQuery = gql`
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

    const overlappingQuery = gql`
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

    const setPlanMutation = gql`
      mutation Account__SetPlanMutation($accountId: ID!, $planId: ID!) {
        accountSetPlan(accountId: $accountId, planId: $planId)
      }
    `;

    const mutationData = {
      accountSetPlan: true,
    };

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
      componentDidCatch(e) {
        done.fail(e);
      }
      render() {
        return this.props.children;
      }
    }

    let refetched;
    class RelatedUIComponent extends React.Component {
      componentWillReceiveProps(props) {
        if (refetched) {
          expect(props.billingData.account.currentPlan.name).toBe('Free');
          done();
        }
      }
      render() {
        return this.props.children;
      }
    }

    const RelatedUIComponentWithData = graphql(overlappingQuery, {
      options: { variables: { accountId } },
      name: 'billingData',
    })(RelatedUIComponent);

    let count = 0;
    class PaymentDetail extends React.Component<
      ChildProps & { setPlan: MutationFunc }
    > {
      componentWillReceiveProps(props) {
        if (count === 1) {
          expect(props.billingData.account.currentPlan.name).toBe('Free');
          done();
        }
        count++;
      }
      async onPaymentInfoChanged() {
        try {
          refetched = true;
          await this.props.setPlan({
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

    const PaymentDetailWithData = compose(
      graphql(setPlanMutation, {
        name: 'setPlan',
      }),
      graphql(billingInfoQuery, {
        options: () => ({
          variables: { accountId },
        }),
        name: 'billingData',
      }),
    )(PaymentDetail);

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
