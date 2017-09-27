/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import Cache from 'apollo-cache-inmemory';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string);

import { mockSingleLink } from '../../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../../src';

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('[queries] lifecycle', () => {
  // lifecycle
  it('reruns the query if it changes', done => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, {
      options: props => ({
        variables: props,
        fetchPolicy: count === 0 ? 'cache-and-network' : 'cache-first',
      }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 1 && data.loading) {
          expect(data.allPeople).toEqual(data1.allPeople);
        }
        if (count === 1 && !data.loading && this.props.data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    }

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  it('rebuilds the queries on prop change when using `options`', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let firstRun = true;
    let isDone = false;
    function options(props) {
      if (!firstRun) {
        expect(props.listId).toBe(2);
        if (!isDone) done();
        isDone = true;
      }
      return {};
    }

    const Container = graphql(query, { options })(props => null);

    class ChangingProps extends React.Component<any, any> {
      state = { listId: 1 };

      componentDidMount() {
        setTimeout(() => {
          firstRun = false;
          this.setState({ listId: 2 });
        }, 50);
      }

      render() {
        return <Container listId={this.state.listId} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  it('reruns the query if just the variables change', done => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, { options: props => ({ variables: props }) })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 1 && data.loading) {
          expect(data.allPeople).toEqual(data1.allPeople);
        }
        if (count === 1 && !data.loading && this.props.data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    }

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  it('reruns the queries on prop change when using passed props', done => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 1 && data.loading) {
          expect(data.allPeople).toEqual(data1.allPeople);
        }
        if (count === 1 && !data.loading && this.props.data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    }

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  xit('stays subscribed to updates after irrelevant prop changes', done => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const variables = { first: 1 };
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables }, result: { data: data2 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    @graphql(query, {
      options() {
        return { variables, notifyOnNetworkStatusChange: false };
      },
    })
    class Container extends React.Component<any, any> {
      8;
      componentWillReceiveProps(props) {
        count += 1;

        if (count == 1) {
          expect(props.foo).toEqual(42);
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          props.changeState();
        } else if (count == 2) {
          expect(props.foo).toEqual(43);
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          props.data.refetch();
        } else if (count == 3) {
          expect(props.foo).toEqual(43);
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    }

    class Parent extends React.Component<any, any> {
      constructor() {
        super();
        this.state = { foo: 42 };
      }
      render() {
        return (
          <Container
            foo={this.state.foo}
            changeState={() => this.setState({ foo: 43 })}
          />
        );
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  xit('correctly rebuilds props on remount', done => {
    const query = gql`
      query pollingPeople {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Darth Skywalker' }] } };
    const link = mockSingleLink({
      request: { query },
      result: { data },
      newData: () => ({
        data: {
          allPeople: {
            people: [{ name: `Darth Skywalker - ${Math.random()}` }],
          },
        },
      }),
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let wrapper,
      app,
      count = 0;

    @graphql(query, {
      options: { pollInterval: 10, notifyOnNetworkStatusChange: false },
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (count === 1) {
          // has data
          wrapper.unmount();
          wrapper = mount(app);
        }

        if (count === 10) {
          wrapper.unmount();
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    }

    app = (
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );

    wrapper = mount(app);
  });

  xit('will re-execute a query when the client changes', async () => {
    const query = gql`
      {
        a
        b
        c
      }
    `;
    const link1 = {
      query: jest.fn(() => Promise.resolve({ data: { a: 1, b: 2, c: 3 } })),
    };
    const link2 = {
      query: jest.fn(() => Promise.resolve({ data: { a: 4, b: 5, c: 6 } })),
    };
    const link3 = {
      query: jest.fn(() => Promise.resolve({ data: { a: 7, b: 8, c: 9 } })),
    };
    const client1 = new ApolloClient({ link: link1 });
    const client2 = new ApolloClient({ link: link2 });
    const client3 = new ApolloClient({ link: link3 });
    const renders = [];
    let switchClient;
    let refetchQuery;

    class ClientSwitcher extends React.Component<any, any> {
      state = {
        client: client1,
      };

      componentDidMount() {
        switchClient = newClient => {
          this.setState({ client: newClient });
        };
      }

      render() {
        return (
          <ApolloProvider client={this.state.client}>
            <Query />
          </ApolloProvider>
        );
      }
    }

    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Query extends React.Component<any, any> {
      componentDidMount() {
        refetchQuery = () => this.props.data.refetch();
      }

      render() {
        const { data: { loading, a, b, c } } = this.props;
        renders.push({ loading, a, b, c });
        return null;
      }
    }

    renderer.create(<ClientSwitcher />);

    await wait(1);
    refetchQuery();
    await wait(1);
    switchClient(client2);
    await wait(1);
    refetchQuery();
    await wait(1);
    switchClient(client3);
    await wait(1);
    switchClient(client1);
    await wait(1);
    switchClient(client2);
    await wait(1);
    switchClient(client3);
    await wait(1);

    expect(renders).toEqual([
      { loading: true },
      { loading: false, a: 1, b: 2, c: 3 },
      { loading: true, a: 1, b: 2, c: 3 },
      { loading: false, a: 1, b: 2, c: 3 },
      { loading: true },
      { loading: false, a: 4, b: 5, c: 6 },
      { loading: true, a: 4, b: 5, c: 6 },
      { loading: false, a: 4, b: 5, c: 6 },
      { loading: true },
      { loading: false, a: 7, b: 8, c: 9 },
      { loading: false, a: 1, b: 2, c: 3 },
      { loading: false, a: 4, b: 5, c: 6 },
      { loading: false, a: 7, b: 8, c: 9 },
    ]);
  });

  it('handles racecondition with prefilled data from the server', async done => {
    const query = gql`
      query GetUser($first: Int) {
        user(first: $first) {
          name
        }
      }
    `;
    const variables = { first: 1 };
    const data2 = { user: { name: 'Luke Skywalker' } };

    const link = mockSingleLink({
      request: { query, variables, delay: 10 },
      result: { data: data2 },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
      // prefill the store (like SSR would)
      initialState: {
        apollo: {
          data: {
            ROOT_QUERY: {
              'user({"first":1})': null,
            },
          },
        },
      },
    });

    let hasRefetched,
      count = 0;

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        count++;
      }

      componentDidMount() {
        this.props.data.refetch().then(result => {
          expect(result.data.user.name).toBe('Luke Skywalker');
          done();
        });
      }

      render() {
        const user = this.props.data.user || {};
        const { name = '' } = user;
        if (count === 2) {
          expect(name).toBe('Luke Skywalker');
        }
        return null;
      }
    }

    mount(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>,
    );
  });
});
