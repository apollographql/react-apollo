
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import assign = require('object-assign');

import ApolloClient from 'apollo-client';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../src/test-utils';


import { ApolloProvider, graphql } from '../../../../src';

describe('mutations', () => {

  it('binds a mutation to props', () => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const ContainerWithData =  graphql(query)(({ mutate }) => {
      expect(mutate).toBeTruthy();
      expect(typeof mutate).toBe('function');
      return null;
    });

    renderer.create(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
  });

  it('binds a mutation to custom props', () => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const props = ({ ownProps, addPerson }) => ({
      [ownProps.methodName]: (name: string) => addPerson({ variables: { name }}),
    });

    const ContainerWithData =  graphql(query, { props })(({ test }) => {
      expect(test).toBeTruthy();
      expect(typeof test).toBe('function');
      return null;
    });

    renderer.create(<ApolloProvider client={client}><ContainerWithData methodName='test' /></ApolloProvider>);
  });

  it('does not swallow children errors', () => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let bar;
    const ContainerWithData =  graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    try {
      renderer.create(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/TypeError/);
    }

  });

  it('can execute a mutation', (done) => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate()
          .then(result => {
            expect(result.data).toEqual(data);
            done();
          })
          ;
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('can execute a mutation with variables from props', (done) => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { id: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate()
          .then(result => {
            expect(result.data).toEqual(data);
            done();
          })
          ;
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container id={1} /></ApolloProvider>);
  });

  it('allows falsy values in the mapped variables from props', (done) => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { id: null };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate()
          .then(result => {
            expect(result.data).toEqual(data);
            done();
          })
          ;
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container id={null} /></ApolloProvider>);
  });

  it('errors if the passed props don\'t contain the needed variables', () => {
    const query = gql`
      mutation addPerson($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    const Container =  graphql(query)(() => null);

    try {
      renderer.create(<ApolloProvider client={client}><Container frst={1} /></ApolloProvider>);
    } catch (e) {
      expect(e).toMatch(/Invariant Violation: The operation 'addPerson'/);
    }

  });

  it('rebuilds the mutation on prop change when using `options`', (done) => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    function options(props) {
      // expect(props.listId).toBe(2);
      return {};
    };

    @graphql(query, { options })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (props.listId !== 2) return;
        props.mutate().then(x => done());
      }
      render() {
        return null;
      }
    };
    class ChangingProps extends React.Component<any, any> {
      state = { listId: 1 };

      componentDidMount() {
        setTimeout(() => this.setState({ listId: 2 }), 50);
      }

      render() {
        return <Container listId={this.state.listId} />;
      }
    }

    renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  });

  it('can execute a mutation with custom variables', (done) => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { id: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate({ variables: { id: 1 } })
          .then(result => {
            expect(result.data).toEqual(data);
            done();
          })
          ;
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('allows for passing optimisticResponse for a mutation', (done) => {
    const query = gql`
      mutation createTodo {
        createTodo { id, text, completed, __typename }
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

    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
        this.props.mutate({ optimisticResponse })
          .then(result => {
            expect(result.data).toEqual(data);
            done();
          })
          ;

        const dataInStore = client.queryManager.getDataWithOptimisticResults();
        expect(dataInStore['Todo:99']).toEqual(
          optimisticResponse.createTodo
        );

      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('allows for updating queries from a mutation', (done) => {
    const mutation = gql`
      mutation createTodo {
        createTodo { id, text, completed }
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
          todo_list: assign(originalList, { tasks: [...originalList.tasks, newTask] }),
        };
      },
    };

    const query = gql`
      query todos($id: ID!) {
        todo_list(id: $id) {
          id, title, tasks { id, text, completed }
        }
      }
    `;

    const data = {
      todo_list: { id: '123', title: 'how to apollo', tasks: [] },
    };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: { id: '123' } }, result: { data } },
      { request: { query: mutation }, result: { data: mutationData } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    @graphql(query)
    @graphql(mutation, { options: () => ({ optimisticResponse, updateQueries }) })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (!props.data.todo_list) return;
        if (!props.data.todo_list.tasks.length) {
          props.mutate()
            .then(result => {
              expect(result.data).toEqual(mutationData);
            });

          const dataInStore = client.queryManager.getDataWithOptimisticResults();
          expect(dataInStore['$ROOT_MUTATION.createTodo']).toEqual(
            optimisticResponse.createTodo
          );
          return;
        }

        if (count === 0) {
          count ++;
          expect(props.data.todo_list.tasks).toEqual([optimisticResponse.createTodo]);
        } else if (count === 1) {
          expect(props.data.todo_list.tasks).toEqual([mutationData.createTodo]);
          done();
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container id={'123'} /></ApolloProvider>);
  });

  // This is a long test that keeps track of a lot of stuff. It is testing
  // whether or not the `updateQueries` reducers will run even when a given
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
  it('will run `updateQueries` for a previously mounted component', () => new Promise((resolve, reject) => {
    const mutation = gql`
      mutation createTodo {
        createTodo { id, text, completed }
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

    const updateQueries = {
      todos: (previousQueryResult, { mutationResult, queryVariables }) => {
        todoUpdateQueryCount++;

        if (queryVariables.id !== '123') {
          // this isn't the query we updated, so just return the previous result
          return previousQueryResult;
        }
        // otherwise, create a new object with the same shape as the
        // previous result with the mutationResult incorporated
        const originalList = previousQueryResult.todo_list;
        const newTask = mutationResult.data.createTodo;
        return {
          todo_list: assign(originalList, { tasks: [...originalList.tasks, newTask] }),
        };
      },
    };

    const query = gql`
      query todos($id: ID!) {
        todo_list(id: $id) {
          id, title, tasks { id, text, completed }
        }
      }
    `;

    const data = {
      todo_list: { id: '123', title: 'how to apollo', tasks: [] },
    };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: { id: '123' } }, result: { data } },
      { request: { query: mutation }, result: { data: mutationData } },
      { request: { query: mutation }, result: { data: mutationData } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let mutate;

    @graphql(mutation, { options: () => ({ updateQueries }) })
    class Mutation extends React.Component<any, any> {
      componentDidMount () {
        mutate = this.props.mutate;
      }

      render () {
        return null;
      }
    }

    let queryMountCount = 0;
    let queryUnmountCount = 0;
    let queryRenderCount = 0;

    @graphql(query)
    class Query extends React.Component<any, any> {
      componentWillMount () {
        queryMountCount++;
      }

      componentWillUnmount () {
        queryUnmountCount++;
      }

      render () {
        try {
          switch (queryRenderCount++) {
            case 0:
              expect(this.props.data.loading).toBe(true);
              expect(this.props.data.todo_list).toBeFalsy();
              break;
            case 1:
              expect(this.props.data.todo_list).toEqual({
                id: '123',
                title: 'how to apollo',
                tasks: [],
              });
              break;
            case 2:
              expect(queryMountCount).toBe(1);
              expect(queryUnmountCount).toBe(0);
              expect(this.props.data.todo_list).toEqual({
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
              expect(this.props.data.todo_list).toEqual({
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
              expect(this.props.data.todo_list).toEqual({
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
        <Mutation/>
      </ApolloProvider>
    );

    const wrapperQuery1 = renderer.create(
      <ApolloProvider client={client}>
        <Query id="123"/>
      </ApolloProvider>
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
                <Query id="123"/>
              </ApolloProvider>
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
      }, 5);
    }, 5);
  }));

  it('will run `refetchQueries` for a recycled queries', () => new Promise((resolve, reject) => {
    const mutation = gql`
      mutation createTodo {
        createTodo { id, text, completed }
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
          id, title, tasks { id, text, completed }
        }
      }
    `;

    const data = {
      todo_list: { id: '123', title: 'how to apollo', tasks: [] },
    };

    const updatedData = {
      todo_list: { id: '123', title: 'how to apollo', tasks: [mutationData.createTodo] },
    };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: { id: '123' } }, result: { data } },
      { request: { query: mutation }, result: { data: mutationData } },
      {
        request: { query, variables: { id: '123' } },
        result: { data: updatedData }
      },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let mutate;

    @graphql(mutation, {})
    class Mutation extends React.Component<any, any> {
      componentDidMount () {
        mutate = this.props.mutate;
      }

      render () {
        return null;
      }
    }

    let queryMountCount = 0;
    let queryUnmountCount = 0;
    let queryRenderCount = 0;

    @graphql(query)
    class Query extends React.Component<any, any> {
      componentWillMount () {
        queryMountCount++;
      }

      componentWillUnmount () {
        queryUnmountCount++;
      }

      render () {
        try {
          switch (queryRenderCount++) {
            case 0:
              expect(this.props.data.loading).toBe(true);
              expect(this.props.data.todo_list).toBeFalsy();
              break;
            case 1:
              expect(this.props.data.loading).toBe(false);
              expect(this.props.data.todo_list).toEqual({
                id: '123',
                title: 'how to apollo',
                tasks: [],
              });
              break;
            case 2:
              expect(queryMountCount).toBe(2);
              expect(queryUnmountCount).toBe(1);
              expect(this.props.data.todo_list).toEqual(updatedData.todo_list);
              break;
            case 3:
              expect(queryMountCount).toBe(2);
              expect(queryUnmountCount).toBe(1);
              expect(this.props.data.todo_list).toEqual(updatedData.todo_list);
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
        <Mutation/>
      </ApolloProvider>
    );

    const wrapperQuery1 = renderer.create(
      <ApolloProvider client={client}>
        <Query id="123"/>
      </ApolloProvider>
    );

    setTimeout(() => {
      wrapperQuery1.unmount();

      mutate({ refetchQueries: ['todos'] })
        .then((...args) => {
          setTimeout(() => {
            // This re-renders the recycled query that should have been refetched while recycled.
            const wrapperQuery2 = renderer.create(
              <ApolloProvider client={client}>
                <Query id="123"/>
              </ApolloProvider>
            );
            resolve();
          }, 5);
        })
        .catch((error) => {
          reject(error);
          throw error;
        });
    }, 5);
  }));

});
