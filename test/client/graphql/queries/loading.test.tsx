import * as React from 'react';
import * as renderer from 'react-test-renderer';
import * as ReactDOM from 'react-dom';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { mount, ReactWrapper } from 'enzyme';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql, ChildProps } from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';

describe('[queries] loading', () => {
  // networkStatus / loading
  it('exposes networkStatus as a part of the props api', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const link = mockSingleLink({
      request: { query },
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql(query, {
      options: { notifyOnNetworkStatusChange: true },
    })(
      class extends React.Component<ChildProps> {
        componentWillReceiveProps({ data }: ChildProps) {
          expect(data!.networkStatus).toBeTruthy();
          done();
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

  it('should set the initial networkStatus to 1 (loading)', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<ChildProps> {
      constructor(props: ChildProps) {
        super(props);
        const { networkStatus } = props.data!;
        expect(networkStatus).toBe(1);
        done();
      }

      render(): React.ReactNode {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('should set the networkStatus to 7 (ready) when the query is loaded', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql(query, {
      options: { notifyOnNetworkStatusChange: true },
    })(
      class extends React.Component<ChildProps> {
        componentWillReceiveProps(nextProps: ChildProps) {
          expect(nextProps.data!.networkStatus).toBe(7);
          done();
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

  it('should set the networkStatus to 2 (setVariables) when the query variables are changed', done => {
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
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    type Data = typeof data1;
    type Vars = typeof variables1;

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
        notifyOnNetworkStatusChange: true,
      }),
    })(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        componentWillReceiveProps(nextProps: ChildProps<Vars, Data, Vars>) {
          // variables changed, new query is loading, but old data is still there
          if (count === 1 && nextProps.data!.loading) {
            expect(nextProps.data!.networkStatus).toBe(2);
            expect(stripSymbols(nextProps.data!.allPeople)).toEqual(data1.allPeople);
          }
          // query with new variables is loaded
          if (count === 1 && !nextProps.data!.loading && this.props.data!.loading) {
            expect(nextProps.data!.networkStatus).toBe(7);
            expect(stripSymbols(nextProps.data!.allPeople)).toEqual(data2.allPeople);
            done();
          }
        }
        render() {
          return null;
        }
      },
    );

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

  it('resets the loading state after a refetched query', () =>
    new Promise((resolve, reject) => {
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
      const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };

      type Data = typeof data;

      const link = mockSingleLink(
        { request: { query }, result: { data } },
        { request: { query }, result: { data: data2 } },
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      let count = 0;
      const Container = graphql<{}, Data>(query, {
        options: { notifyOnNetworkStatusChange: true },
      })(
        class extends React.Component<ChildProps<{}, Data>> {
          componentWillReceiveProps(props: ChildProps<{}, Data>) {
            switch (count++) {
              case 0:
                expect(props.data!.networkStatus).toBe(7);
                // this isn't reloading fully
                props.data!.refetch();
                break;
              case 1:
                expect(props.data!.loading).toBeTruthy();
                expect(props.data!.networkStatus).toBe(4);
                expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
                break;
              case 2:
                expect(props.data!.loading).toBeFalsy();
                expect(props.data!.networkStatus).toBe(7);
                expect(stripSymbols(props.data!.allPeople)).toEqual(data2.allPeople);
                resolve();
                break;
              default:
                reject(new Error('Too many props updates'));
            }
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
    }));

  it('correctly sets loading state on remounted network-only query', done => {
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
      queryDeduplication: false,
    });

    let wrapper: ReactWrapper<any>;
    let count = 0;

    const Container = graphql<{}, Data>(query, {
      options: { fetchPolicy: 'network-only' },
    })(
      class extends React.Component<ChildProps<{}, Data>> {
        render() {
          if (count === 1) {
            // Has data
            setTimeout(() => {
              wrapper.unmount();
              wrapper = mount(App);
            }, 0);
          }
          if (count === 2) {
            // Loading after remount
            expect(this.props.data!.loading).toBeTruthy();
          }
          if (count === 3) {
            // Fetched data loading after remount
            expect(this.props.data!.loading).toBeFalsy();
            expect(this.props.data!.allPeople!.people[0].name).toMatch(/Darth Skywalker - /);
            done();
          }
          count += 1;
          return null;
        }
      },
    );

    const App: React.ReactElement<any> = (
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );

    wrapper = mount(App);
  });

  it('correctly sets loading state on remounted component with changed variables', done => {
    const query: DocumentNode = gql`
      query remount($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    interface Data {
      allPeople: {
        people: { name: string }[];
      };
    }
    const data = { allPeople: null };
    const variables = { first: 1 };
    const variables2 = { first: 2 };

    type Vars = typeof variables;

    const link = mockSingleLink(
      { request: { query, variables }, result: { data }, delay: 10 },
      {
        request: { query, variables: variables2 },
        result: { data },
        delay: 10,
      },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let wrapper: ReactWrapper<any>,
      render: (num: number) => React.ReactElement<any>,
      count = 0;

    interface Props {
      first: number;
    }
    const Container = graphql<Props, Data, Vars>(query, {
      options: ({ first }) => ({ variables: { first } }),
    })(
      class extends React.Component<ChildProps<Props, Data, Vars>> {
        componentWillMount() {
          if (count === 1) {
            expect(this.props.data!.loading).toBeTruthy(); // on remount
            count++;
          }
        }
        componentWillReceiveProps(props: ChildProps<Props, Data, Vars>) {
          if (count === 0) {
            // has data
            wrapper.unmount();
            setTimeout(() => {
              wrapper = mount(render(2));
            }, 5);
          }

          if (count === 2) {
            // remounted data after fetch
            expect(props.data!.loading).toBeFalsy();
            done();
          }
          count++;
        }
        render() {
          return null;
        }
      },
    );

    render = (first: number) => (
      <ApolloProvider client={client}>
        <Container first={first} />
      </ApolloProvider>
    );

    wrapper = mount(render(1));
  });

  it('correctly sets loading state on remounted component with changed variables (alt)', done => {
    const query: DocumentNode = gql`
      query remount($name: String) {
        allPeople(name: $name) {
          people {
            name
          }
        }
      }
    `;

    interface Data {
      allPeople: {
        people: { name: string }[];
      };
    }
    const data = { allPeople: null };
    const variables = { name: 'does-not-exist' };
    const variables2 = { name: 'nothing-either' };

    type Vars = typeof variables;

    const link = mockSingleLink(
      { request: { query, variables }, result: { data } },
      {
        request: { query, variables: variables2 },
        result: { data },
      },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    let wrapper: any;

    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        render() {
          const { loading } = this.props.data!;
          if (count === 0) expect(loading).toBeTruthy();
          if (count === 1) {
            expect(loading).toBeFalsy();
            setTimeout(() => {
              wrapper.unmount();
              mount(
                <ApolloProvider client={client}>
                  <Container {...variables2} />
                </ApolloProvider>
              );
            }, 0);
          }
          if (count === 2) expect(loading).toBeTruthy();
          if (count === 3) {
            expect(loading).toBeFalsy();
            done();
          }
          count++;
          return null;
        }
      },
    );

    wrapper = mount(
      <ApolloProvider client={client}>
        <Container {...variables} />
      </ApolloProvider>
    )
  });

  it('correctly sets loading state on component with changed variables and unchanged result', done => {
    const query: DocumentNode = gql`
      query remount($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    interface Data {
      allPeople: {
        people: { name: string }[];
      };
    }

    const data = { allPeople: null };
    const variables = { first: 1 };
    const variables2 = { first: 2 };

    type Vars = typeof variables;
    const link = mockSingleLink(
      { request: { query, variables }, result: { data } },
      {
        request: { query, variables: variables2 },
        result: { data },
      },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let count = 0;

    interface Props extends Vars {
      setFirst: (first: number) => void;
    }

    const connect = (component: React.ComponentType<Props>): React.ComponentType<{}> => {
      return class extends React.Component<{}, { first: number }> {
        constructor(props: {}) {
          super(props);

          this.state = {
            first: 1,
          };
          this.setFirst = this.setFirst.bind(this);
        }

        setFirst(first: number) {
          this.setState({ first });
        }

        render() {
          return React.createElement(component, {
            first: this.state.first,
            setFirst: this.setFirst,
          });
        }
      };
    };

    const Container = connect(
      graphql<Props, Data, Vars>(query, {
        options: ({ first }) => ({ variables: { first } }),
      })(
        class extends React.Component<ChildProps<Props, Data, Vars>> {
          render() {
            if (count === 0) {
              expect(this.props.data!.loading).toBeTruthy(); // has initial data
            }

            if (count === 1) {
              expect(this.props.data!.loading).toBeFalsy();
              this.props.setFirst(2);
            }

            if (count === 2) {
              expect(this.props.data!.loading).toBeTruthy(); // on variables change
            }

            if (count === 3) {
              // new data after fetch
              expect(this.props.data!.loading).toBeFalsy();
              done();
            }
            count++;

            return null;
          }
        },
      ),
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
