import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql, ChildProps, Query as QueryComponent } from '../../../../src';
import wait from '../../../test-utils/wait';
import stripSymbols from '../../../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';
import { create } from 'react-test-renderer';

describe('[queries] lifecycle', () => {
  // lifecycle
  it('reruns the query if it changes', done => {
    let count = 0;
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;
    const variables1 = { first: 1 };
    type Vars = typeof variables1;

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

    const Container = graphql<Vars, Data, Vars>(query, {
      options: props => ({
        variables: props,
        fetchPolicy: count === 0 ? 'cache-and-network' : 'cache-first',
      }),
    })(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        componentWillReceiveProps({ data }: ChildProps<Vars, Data, Vars>) {
          // loading is true, but data still there
          if (count === 1 && data!.loading) {
            expect(stripSymbols(data!.allPeople)).toEqual(data1.allPeople);
          }
          if (count === 1 && !data!.loading && this.props.data!.loading) {
            expect(stripSymbols(data!.allPeople)).toEqual(data2.allPeople);
            done();
          }
        }
        render() {
          return null;
        }
      },
    );

    class ChangingProps extends React.Component<{}, { first: number }> {
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
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

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
    function options(props: Props) {
      if (!firstRun) {
        expect(props.listId).toBe(2);
        if (!isDone) done();
        isDone = true;
      }
      return {};
    }
    interface Props {
      listId: number;
    }

    const Container = graphql<Props, Data>(query, { options })(() => null);

    class ChangingProps extends React.Component<{}, { listId: number }> {
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
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;

    const variables1 = { first: 1 };
    type Vars = typeof variables1;

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

    const Container = graphql<Vars, Data, Vars>(query, {
      options: props => ({ variables: props }),
    })(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        componentWillReceiveProps({ data }: ChildProps<Vars, Data, Vars>) {
          // loading is true, but data still there
          if (count === 1 && data!.loading) {
            expect(stripSymbols(data!.allPeople)).toEqual(data1.allPeople);
          }
          if (count === 1 && !data!.loading && this.props.data!.loading) {
            expect(stripSymbols(data!.allPeople)).toEqual(data2.allPeople);
            done();
          }
        }
        render() {
          return null;
        }
      },
    );

    class ChangingProps extends React.Component<any, { first: number }> {
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
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;

    const variables1 = { first: 1 };
    type Vars = typeof variables1;

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

    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        componentWillReceiveProps({ data }: ChildProps<Vars, Data, Vars>) {
          // loading is true, but data still there
          if (count === 1 && data!.loading) {
            expect(stripSymbols(data!.allPeople)).toEqual(data1.allPeople);
          }
          if (count === 1 && !data!.loading && this.props.data!.loading) {
            expect(stripSymbols(data!.allPeople)).toEqual(data2.allPeople);
            done();
          }
        }
        render() {
          return null;
        }
      },
    );

    class ChangingProps extends React.Component<any, { first: number }> {
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

  it('stays subscribed to updates after irrelevant prop changes', done => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const variables = { first: 1 };
    type Vars = typeof variables;
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables }, result: { data: data2 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface Props {
      foo: number;
      changeState: () => void;
    }

    let count = 0;
    const Container = graphql<Props, Data, Vars>(query, {
      options: { variables, notifyOnNetworkStatusChange: false },
    })(
      class extends React.Component<ChildProps<Props, Data, Vars>> {
        componentWillReceiveProps(props: ChildProps<Props, Data, Vars>) {
          count += 1;
          try {
            if (count === 1) {
              expect(props.foo).toEqual(42);
              expect(props.data!.loading).toEqual(false);
              expect(stripSymbols(props.data!.allPeople)).toEqual(data1.allPeople);
              props.changeState();
            } else if (count === 2) {
              expect(props.foo).toEqual(43);
              expect(props.data!.loading).toEqual(false);
              expect(stripSymbols(props.data!.allPeople)).toEqual(data1.allPeople);
              props.data!.refetch();
            } else if (count === 3) {
              expect(props.foo).toEqual(43);
              expect(props.data!.loading).toEqual(false);
              expect(stripSymbols(props.data!.allPeople)).toEqual(data2.allPeople);
              done();
            }
          } catch (e) {
            done.fail(e);
          }
        }
        render() {
          return null;
        }
      },
    );

    class Parent extends React.Component<any, any> {
      state = { foo: 42 };
      render() {
        return <Container foo={this.state.foo} changeState={() => this.setState({ foo: 43 })} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it('correctly rebuilds props on remount', done => {
    const query: DocumentNode = gql`
      query pollingPeople {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Darth Skywalker' }] } };
    type Data = typeof data;
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
    let wrapper: ReactWrapper<any>,
      app: React.ReactElement<any>,
      count = 0;

    const Container = graphql<{}, Data>(query, {
      options: { pollInterval: 10, notifyOnNetworkStatusChange: false },
    })(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillReceiveProps() {
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
      },
    );

    app = (
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );

    wrapper = mount(app);
  });

  it('will re-execute a query when the client changes', async () => {
    const query: DocumentNode = gql`
      {
        a
        b
        c
      }
    `;
    const link1 = mockSingleLink(
      {
        request: { query },
        result: { data: { a: 1, b: 2, c: 3 } },
      },
      {
        request: { query },
        result: { data: { a: 1, b: 2, c: 3 } },
      },
      {
        request: { query },
        result: { data: { a: 1, b: 2, c: 3 } },
      },
    );
    const link2 = mockSingleLink(
      {
        request: { query },
        result: { data: { a: 4, b: 5, c: 6 } },
      },
      {
        request: { query },
        result: { data: { a: 4, b: 5, c: 6 } },
      },
      {
        request: { query },
        result: { data: { a: 4, b: 5, c: 6 } },
      },
    );
    const link3 = mockSingleLink(
      {
        request: { query },
        result: { data: { a: 7, b: 8, c: 9 } },
      },
      {
        request: { query },
        result: { data: { a: 7, b: 8, c: 9 } },
      },
      {
        request: { query },
        result: { data: { a: 7, b: 8, c: 9 } },
      },
    );
    const client1 = new ApolloClient({
      link: link1,
      cache: new Cache({ addTypename: false }),
    });
    const client2 = new ApolloClient({
      link: link2,
      cache: new Cache({ addTypename: false }),
    });
    const client3 = new ApolloClient({
      link: link3,
      cache: new Cache({ addTypename: false }),
    });

    interface Data {
      a: number;
      b: number;
      c: number;
    }
    const renders: (Partial<Data> & { loading: boolean })[] = [];
    let switchClient: (client: ApolloClient<any>) => void;
    let refetchQuery: () => void;

    const Query = graphql<{}, Data>(query, {
      options: { notifyOnNetworkStatusChange: true },
    })(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidMount() {
          refetchQuery = () => this.props.data!.refetch();
        }

        render() {
          const { loading, a, b, c } = this.props.data!;
          renders.push({ loading, a, b, c });
          return null;
        }
      },
    );

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

    renderer.create(<ClientSwitcher />);

    await wait(1);
    refetchQuery!();
    await wait(1);
    switchClient!(client2);
    await wait(1);
    refetchQuery!();
    await wait(1);
    switchClient!(client3);
    await wait(1);
    switchClient!(client1);
    await wait(1);
    switchClient!(client2);
    await wait(1);
    switchClient!(client3);
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

  it('handles synchronous racecondition with prefilled data from the server', async done => {
    const query: DocumentNode = gql`
      query GetUser($first: Int) {
        user(first: $first) {
          name
        }
      }
    `;
    const variables = { first: 1 };
    type Vars = typeof variables;
    const data2 = { user: { name: 'Luke Skywalker' } };
    type Data = typeof data2;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data: data2 },
      delay: 10,
    });
    const initialState = {
      apollo: {
        data: {
          ROOT_QUERY: {
            'user({"first":1})': null,
          },
        },
      },
    };

    const client = new ApolloClient({
      link,
      // prefill the store (like SSR would)
      // @see https://github.com/zeit/next.js/blob/master/examples/with-apollo/lib/initApollo.js
      cache: new Cache({ addTypename: false }).restore(initialState),
    });

    let count = 0;
    const Container = graphql<Vars, Data>(query)(
      class extends React.Component<ChildProps<Vars, Data>> {
        componentWillReceiveProps() {
          count++;
        }

        componentDidMount() {
          this.props.data!.refetch().then(result => {
            expect(result.data.user.name).toBe('Luke Skywalker');
            done();
          });
        }

        render() {
          const user = this.props.data!.user;
          const name = user ? user.name : '';
          if (count === 2) {
            expect(name).toBe('Luke Skywalker');
          }
          return null;
        }
      },
    );

    mount(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>,
    );
  });

  it('handles asynchronous racecondition with prefilled data from the server', async done => {
    const query: DocumentNode = gql`
      query Q {
        books {
          name
          __typename
        }
      }
    `;

    const ssrResult = {
      books: [
        {
          name: 'ssrfirst',
          __typename: 'Book',
        },
      ],
    };

    const result = {
      books: [
        {
          name: 'first',
          __typename: 'Book',
        },
      ],
    };

    const ssrLink = mockSingleLink({
      request: { query } as any,
      result: { data: ssrResult },
    });

    const link = mockSingleLink({
      request: { query } as any,
      result: { data: result },
    });

    const ssrClient = new ApolloClient({
      cache: new Cache(),
      link: ssrLink,
    });
    await ssrClient.query({
      query,
      variables: {},
    });
    const client = new ApolloClient({
      cache: new Cache().restore(ssrClient.extract()), // --- this is the "SSR" bit
      link,
    });

    //try to render the app / call refetch / etc

    let refetched = false;
    const ApolloApp = (
      <ApolloProvider client={client}>
        <QueryComponent query={query}>
          {({ loading, data, error, refetch }) => {
            if (loading) {
              done.fail('should not be loading, since already have data from ssr');
              return <div>loading</div>;
            }
            if (error) {
              done.fail(error);
              return <div>error</div>;
            }

            try {
              if (!refetched) {
                expect(data.books[0].name).toEqual('ssrfirst');
                //setTimeout allows component to mount, which often happens
                //when waiting  ideally we should be able to call refetch
                //immediately However the subscription needs to start before
                //we update the data To get around this issue, we would need
                //to start the subscription before we render to the page. In
                //practice, this seems like an uncommon use case, since the
                //data you get is fresh, so one would wait for an interaction
                setTimeout(() => {
                  refetch()
                    .then(refetchResult => {
                      expect(refetchResult.data.books[0].name).toEqual('first');
                      done();
                    })
                    .catch(done.fail);
                });
                refetched = true;
              } else {
                expect(data.books[0].name).toEqual('first');
              }
            } catch (e) {
              done.fail(e);
            }
            return <p> stub </p>;
          }}
        </QueryComponent>
      </ApolloProvider>
    );

    //render
    expect(create(ApolloApp).toJSON()).toMatchSnapshot();
  });
});
