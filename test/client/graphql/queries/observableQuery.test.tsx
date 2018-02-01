import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql, ChildProps } from '../../../../src';
import stripSymbols from '../../../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';

describe('[queries] observableQuery', () => {
  // observableQuery
  it('will recycle `ObservableQuery`s when re-rendering the entire tree', done => {
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

    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    // storage
    // let queryObservable1: ObservableQuery<any>;
    // let queryObservable2: ObservableQuery<any>;
    // let originalOptions;
    let wrapper1: ReactWrapper<any>;
    // let wrapper2;
    let count = 0;
    // let recycledOptions;

    const assert1 = () => {
      const keys = Array.from((client.queryManager as any).queries.keys());
      expect(keys).toEqual(['1']);
      // queryObservable1 = (client.queryManager as any).queries.get('1').observableQuery;
      // originalOptions = Object.assign({}, queryObservable1.options);
    };

    const assert2 = () => {
      const keys = Array.from((client.queryManager as any).queries.keys());
      expect(keys).toEqual(['1']);
    };

    const Container = graphql<{}, Data>(query, {
      options: { fetchPolicy: 'cache-and-network' },
    })(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillMount() {
          // during the first mount, the loading prop should be true;
          if (count === 0) {
            expect(this.props.data!.loading).toBeTruthy();
          }

          // during the second mount, the loading prop should be false, and data should
          // be present;
          if (count === 3) {
            expect(this.props.data!.loading).toBeFalsy();
            expect(stripSymbols(this.props.data!.allPeople)).toEqual(
              data.allPeople,
            );
          }
        }

        componentDidMount() {
          if (count === 4) {
            wrapper1.unmount();
            done();
          }
        }

        componentDidUpdate(prevProps: ChildProps<{}, Data>) {
          if (count === 3) {
            expect(prevProps.data!.loading).toBeTruthy();
            expect(this.props.data!.loading).toBeFalsy();
            expect(stripSymbols(this.props.data!.allPeople)).toEqual(
              data.allPeople,
            );

            // ensure first assertion and umount tree
            assert1();
            wrapper1.find('#break').simulate('click');

            // ensure cleanup
            assert2();
          }
        }

        render() {
          // side effect to keep track of render counts
          count++;
          return null;
        }
      },
    );

    class RedirectOnMount extends React.Component<{ onMount: () => void }> {
      componentWillMount() {
        this.props.onMount();
      }

      render() {
        return null;
      }
    }

    class AppWrapper extends React.Component<{}, { renderRedirect: boolean }> {
      state = {
        renderRedirect: false,
      };

      goToRedirect = () => {
        this.setState({ renderRedirect: true });
      };

      handleRedirectMount = () => {
        this.setState({ renderRedirect: false });
      };

      render() {
        if (this.state.renderRedirect) {
          return <RedirectOnMount onMount={this.handleRedirectMount} />;
        } else {
          return (
            <div>
              <Container />
              <button id="break" onClick={this.goToRedirect}>
                Break things
              </button>
            </div>
          );
        }
      }
    }

    wrapper1 = mount(
      <ApolloProvider client={client}>
        <AppWrapper />
      </ApolloProvider>,
    );
  });

  it('will not try to refetch recycled `ObservableQuery`s when resetting the client store', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;

    // const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    let finish = () => {}; // tslint:disable-line
    let called = 0;
    const link = new ApolloLink((o, f) => {
      called++;
      setTimeout(finish, 5);
      return f ? f(o) : null;
    }).concat(
      mockSingleLink({
        request: { query },
        result: { data: { allPeople: null } },
      }),
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    // make sure that the in flight query is done before resetting store
    finish = () => {
      client.resetStore();

      // The query should not have been fetch again
      expect(called).toBe(1);

      done();
    };

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        render() {
          return null;
        }
      },
    );

    const wrapper1 = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );

    let keys = Array.from((client.queryManager as any).queries.keys());
    expect(keys).toEqual(['1']);
    const queryObservable1 = (client.queryManager as any).queries.get('1')
      .observableQuery;

    // The query should only have been invoked when first mounting and not when resetting store
    expect(called).toBe(1);

    wrapper1.unmount();

    keys = Array.from((client.queryManager as any).queries.keys());
    expect(keys).toEqual(['1']);
    const queryObservable2 = (client.queryManager as any).queries.get('1')
      .observableQuery;

    expect(queryObservable1).toBe(queryObservable2);
  });

  it('will recycle `ObservableQuery`s when re-rendering a portion of the tree', done => {
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

    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let remount: any;

    class Remounter extends React.Component<any, any> {
      state = {
        showChildren: true,
      };

      componentDidMount() {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({ showChildren: true });
            }, 5);
          });
        };
      }

      render() {
        return this.state.showChildren ? this.props.children : null;
      }
    }

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        render() {
          return null;
        }
      },
    );

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Remounter>
          <Container />
        </Remounter>
      </ApolloProvider>,
    );

    let keys = Array.from((client.queryManager as any).queries.keys());
    expect(keys).toEqual(['1']);
    const queryObservable1 = (client.queryManager as any).queries.get('1')
      .observableQuery;

    remount();

    setTimeout(() => {
      keys = Array.from((client.queryManager as any).queries.keys());
      expect(keys).toEqual(['1']);
      const queryObservable2 = (client.queryManager as any).queries.get('1')
        .observableQuery;
      expect(queryObservable1).toBe(queryObservable2);

      remount();

      setTimeout(() => {
        keys = Array.from((client.queryManager as any).queries.keys());
        expect(keys).toEqual(['1']);
        const queryObservable3 = (client.queryManager as any).queries.get('1')
          .observableQuery;
        expect(queryObservable1).toBe(queryObservable3);

        wrapper.unmount();
        done();
      }, 10);
    }, 10);
  });

  it('will not recycle parallel GraphQL container `ObservableQuery`s', done => {
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
    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let remount: any;

    class Remounter extends React.Component<any, any> {
      state = {
        showChildren: true,
      };

      componentDidMount() {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({ showChildren: true });
            }, 5);
          });
        };
      }

      render() {
        return this.state.showChildren ? this.props.children : null;
      }
    }

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        render() {
          return null;
        }
      },
    );

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <div>
          <Container />
          <Remounter>
            <Container />
          </Remounter>
        </div>
      </ApolloProvider>,
    );

    let keys = Array.from((client.queryManager as any).queries.keys());
    expect(keys).toEqual(['1', '2']);
    const queryObservable1 = (client.queryManager as any).queries.get('1')
      .observableQuery;
    const queryObservable2 = (client.queryManager as any).queries.get('2')
      .observableQuery;
    expect(queryObservable1).not.toBe(queryObservable2);

    remount();

    setTimeout(() => {
      keys = Array.from((client.queryManager as any).queries.keys());
      expect(keys).toEqual(['1', '2']);
      const queryObservable3 = (client.queryManager as any).queries.get('1')
        .observableQuery;
      const queryObservable4 = (client.queryManager as any).queries.get('2')
        .observableQuery;
      expect(queryObservable1).not.toBe(queryObservable2);

      // What we really want to test here is if the `queryObservable` on
      // `Container`s are referentially equal. But because there is no way to
      // get the component instances we compare against the query manager
      // observable queries map isntead which shouldn’t change.
      expect(queryObservable3).not.toBeFalsy();
      expect(queryObservable4).not.toBeFalsy();
      expect(queryObservable3).toBe(queryObservable1);
      expect(queryObservable4).toBe(queryObservable2);

      wrapper.unmount();
      done();
    }, 10);
  });

  it("will recycle `ObservableQuery`s when re-rendering a portion of the tree but not return stale data if variables don't match", done => {
    const query: DocumentNode = gql`
      query people($first: Int!) {
        allPeople(first: $first) {
          people {
            name
            friends(id: $first) {
              name
            }
          }
        }
      }
    `;
    const variables1 = { first: 1 };
    const variables2 = { first: 2 };
    const data = {
      allPeople: {
        people: [{ name: 'Luke Skywalker', friends: [{ name: 'r2d2' }] }],
      },
    };
    const data2 = {
      allPeople: {
        people: [{ name: 'Leia Skywalker', friends: [{ name: 'luke' }] }],
      },
    };

    type Data = typeof data;
    type Vars = typeof variables1;

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let remount: any;

    class Remounter extends React.Component<
      { render: typeof Container },
      { showChildren: boolean; variables: Vars }
    > {
      state = {
        showChildren: true,
        variables: variables1,
      };

      componentDidMount() {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({
                showChildren: true,
                variables: variables2,
              });
            }, 10);
          });
        };
      }

      render() {
        if (!this.state.showChildren) return null;
        const Thing = this.props.render;
        return <Thing first={this.state.variables.first} />;
      }
    }

    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        render() {
          try {
            const { variables, loading, allPeople } = this.props.data!;
            // first variable render
            if (variables.first === 1) {
              if (loading) expect(allPeople).toBeUndefined();
              if (!loading) {
                expect(stripSymbols(allPeople)).toEqual(data.allPeople);
              }
            }

            if (variables.first === 2) {
              // second variables render
              if (loading) expect(allPeople).toBeUndefined();
              if (!loading)
                expect(stripSymbols(allPeople)).toEqual(data2.allPeople);
            }
          } catch (e) {
            done.fail(e);
          }

          return null;
        }
      },
    );

    // the initial mount fires off the query
    // the same as episode id = 1
    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Remounter render={Container} />
      </ApolloProvider>,
    );

    // after the initial data has been returned
    // the user navigates to a different page
    // but the query is recycled
    setTimeout(() => {
      // move to the "home" page from the "episode" page
      remount();
      setTimeout(() => {
        // move to a new "epsiode" page
        // epsiode id = 2
        // wait to verify the data isn't stale then end
        wrapper.unmount();
        done();
      }, 20);
    }, 5);
  });
});
