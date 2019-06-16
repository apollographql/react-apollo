import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('[queries] observableQuery', () => {
  afterEach(cleanup);

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
      { request: { query }, result: { data } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let unmount: any;
    let queryByText: any;
    let count = 0;

    const assert1 = () => {
      const keys = Array.from((client.queryManager as any).queries.keys());
      expect(keys).toEqual(['1']);
    };

    const assert2 = () => {
      const keys = Array.from((client.queryManager as any).queries.keys());
      expect(keys).toEqual(['1']);
    };

    const Container = graphql<{}, Data>(query, {
      options: { fetchPolicy: 'cache-and-network' }
    })(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidMount() {
          if (count === 3) {
            unmount();
            done();
          }
        }

        componentDidUpdate() {
          if (count === 2) {
            expect(this.props.data!.loading).toBeFalsy();
            expect(stripSymbols(this.props.data!.allPeople)).toEqual(
              data.allPeople
            );

            // ensure first assertion and umount tree
            assert1();
            fireEvent.click(queryByText('Break things'));

            // ensure cleanup
            assert2();
          }
        }

        render() {
          // during the first mount, the loading prop should be true;
          if (count === 0) {
            expect(this.props.data!.loading).toBeTruthy();
          }

          // during the second mount, the loading prop should be false, and data should
          // be present;
          if (count === 2) {
            expect(this.props.data!.loading).toBeTruthy();
            expect(stripSymbols(this.props.data!.allPeople)).toEqual(
              data.allPeople
            );
          }

          count++;
          return null;
        }
      }
    );

    class RedirectOnMount extends React.Component<{ onMount: () => void }> {
      componentDidMount() {
        this.props.onMount();
      }

      render() {
        return null;
      }
    }

    class AppWrapper extends React.Component<{}, { renderRedirect: boolean }> {
      state = {
        renderRedirect: false
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

    const result = render(
      <ApolloProvider client={client}>
        <AppWrapper />
      </ApolloProvider>
    );
    unmount = result.unmount;
    queryByText = result.queryByText;
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
        people: [{ name: 'Luke Skywalker', friends: [{ name: 'r2d2' }] }]
      }
    };
    const data2 = {
      allPeople: {
        people: [{ name: 'Leia Skywalker', friends: [{ name: 'luke' }] }]
      }
    };

    type Data = typeof data;
    type Vars = typeof variables1;

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    let remount: any;

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
      }
    );

    class Remounter extends React.Component<
      { render: typeof Container },
      { showChildren: boolean; variables: Vars }
    > {
      state = {
        showChildren: true,
        variables: variables1
      };

      componentDidMount() {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({
                showChildren: true,
                variables: variables2
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

    // the initial mount fires off the query
    // the same as episode id = 1
    render(
      <ApolloProvider client={client}>
        <Remounter render={Container} />
      </ApolloProvider>
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
        done();
      }, 20);
    }, 5);
  });

  it('not overly rerender', done => {
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

    const variables = { first: 1 };
    const data = {
      allPeople: {
        people: [{ name: 'Luke Skywalker', friends: [{ name: 'r2d2' }] }]
      }
    };
    type Data = typeof data;
    type Vars = typeof variables;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data }
    });

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    let remount: any;

    let count = 0;
    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        render() {
          count++;
          try {
            const { loading, allPeople } = this.props.data!;
            // first variable render
            if (count === 1) {
              expect(loading).toBe(true);
            }
            if (count === 2 || count === 3) {
              expect(loading).toBe(false);
              expect(stripSymbols(allPeople)).toEqual(data.allPeople);
            }

            if (count > 3) {
              throw new Error('too many renders');
            }
          } catch (e) {
            done.fail(e);
          }

          return null;
        }
      }
    );

    class Remounter extends React.Component<
      { render: typeof Container },
      { showChildren: boolean; variables: Vars }
    > {
      state = {
        showChildren: true,
        variables
      };

      componentDidMount() {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({ showChildren: true, variables });
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

    // the initial mount fires off the query
    // the same as episode id = 1
    render(
      <ApolloProvider client={client}>
        <Remounter render={Container} />
      </ApolloProvider>
    );

    // after the initial data has been returned
    // the user navigates to a different page
    // but the query is recycled
    setTimeout(() => {
      // move to the "home" page from the "episode" page
      remount();
      setTimeout(() => {
        // move to the same "episode" page
        // make sure we dont over render
        done();
      }, 20);
    }, 5);
  });

  it('does rerender if query returns differnt result', done => {
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

    const variables = { first: 1 };
    const dataOne = {
      allPeople: {
        people: [{ name: 'Luke Skywalker', friends: [{ name: 'r2d2' }] }]
      }
    };
    const dataTwo = {
      allPeople: {
        people: [
          { name: 'Luke Skywalker', friends: [{ name: 'Leia Skywalker' }] }
        ]
      }
    };

    type Data = typeof dataOne;
    type Vars = typeof variables;

    const link = mockSingleLink(
      {
        request: { query, variables },
        result: { data: dataOne }
      },
      {
        request: { query, variables },
        result: { data: dataTwo }
      }
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    let remount: any;

    let count = 0;
    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        render() {
          count++;
          try {
            const { loading, allPeople, refetch } = this.props.data!;
            // first variable render
            if (count === 1) {
              expect(loading).toBe(true);
            }
            if (count === 2) {
              expect(loading).toBe(false);
              expect(stripSymbols(allPeople)).toEqual(dataOne.allPeople);
              refetch();
            }
            if (count === 3) {
              expect(loading).toBe(false);
              expect(stripSymbols(allPeople)).toEqual(dataTwo.allPeople);
              done();
            }
            if (count > 3) {
              throw new Error('too many renders');
            }
          } catch (e) {
            done.fail(e);
          }

          return null;
        }
      }
    );

    // the initial mount fires off the query
    // the same as episode id = 1
    render(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>
    );
  });
});
