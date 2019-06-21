import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { DocumentNode } from 'graphql';
import { ApolloProvider } from '@apollo/react-common';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('[queries] api', () => {
  afterEach(cleanup);

  // api
  it('exposes refetch as part of the props api', done => {
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
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables: { first: 2 } }, result: { data: data1 } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let hasRefetched = false,
      count = 0;

    interface Props {
      first: number;
    }
    interface Data {
      allPeople: { people: [{ name: string }] };
    }

    const Container = graphql<Props, Data>(query)(
      class extends React.Component<ChildProps<Props, Data>> {
        componentDidUpdate() {
          const { data } = this.props;
          try {
            if (count === 0) expect(data!.loading).toBeFalsy(); // first data
            if (count === 1) expect(data!.loading).toBeTruthy(); // first refetch
            if (count === 2) expect(data!.loading).toBeFalsy(); // second data
            if (count === 3) expect(data!.loading).toBeTruthy(); // second refetch
            if (count === 4) expect(data!.loading).toBeFalsy(); // third data
            count++;
            if (hasRefetched) return;
            hasRefetched = true;
            expect(data!.refetch).toBeTruthy();
            expect(data!.refetch instanceof Function).toBeTruthy();
            data!
              .refetch()
              .then((result: any) => {
                expect(stripSymbols(result.data)).toEqual(data1);
                return data!
                  .refetch({ first: 2 }) // new variables
                  .then((response: any) => {
                    expect(stripSymbols(response.data)).toEqual(data1);
                    expect(stripSymbols(data!.allPeople)).toEqual(
                      data1.allPeople
                    );
                    done();
                  });
              })
              .catch(done.fail);
          } catch (e) {
            done.fail(e);
          }
        }

        render() {
          expect(this.props.data!.refetch).toBeTruthy();
          expect(this.props.data!.refetch instanceof Function).toBeTruthy();

          return <div>{this.props.first}</div>;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>
    );
  });

  it('exposes subscribeToMore as part of the props api', done => {
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    // example of loose typing
    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        render() {
          const { data } = this.props;
          if (data && !data.loading) {
            expect(data!.subscribeToMore).toBeTruthy();
            expect(data!.subscribeToMore instanceof Function).toBeTruthy();
            done();
          }
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

  it('exposes fetchMore as part of the props api', done => {
    const query: DocumentNode = gql`
      query people($skip: Int, $first: Int) {
        allPeople(first: $first, skip: $skip) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data1 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };

    type Data = typeof data;

    const variables = { skip: 1, first: 1 };
    const variables2 = { skip: 2, first: 1 };

    type Variables = typeof variables;

    const link = mockSingleLink(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data1 } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let count = 0;
    const Container = graphql<{}, Data, Variables>(query, {
      options: () => ({ variables })
    })(
      class extends React.Component<ChildProps<{}, Data, Variables>> {
        componentDidUpdate() {
          const { props } = this;
          if (count === 0) {
            expect(props.data!.fetchMore).toBeTruthy();
            expect(props.data!.fetchMore instanceof Function).toBeTruthy();
            props
              .data!.fetchMore({
                variables: { skip: 2 },
                updateQuery: (prev: any, { fetchMoreResult }) => ({
                  allPeople: {
                    people: prev.allPeople.people.concat(
                      fetchMoreResult!.allPeople.people
                    )
                  }
                })
              })
              .then((result: any) => {
                try {
                  expect(stripSymbols(result.data.allPeople.people)).toEqual(
                    data1.allPeople.people
                  );
                } catch (error) {
                  done(error);
                }
              });
          } else if (count === 1) {
            expect(stripSymbols(props.data!.variables)).toEqual(variables);
            expect(props.data!.loading).toBeFalsy();
            expect(stripSymbols(props.data!.allPeople!.people)).toEqual(
              data.allPeople.people.concat(data1.allPeople.people)
            );
            done();
          } else {
            throw new Error('should not reach this point');
          }
          count++;
        }

        render() {
          expect(this.props.data!.fetchMore).toBeTruthy();
          expect(this.props.data!.fetchMore instanceof Function).toBeTruthy();

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

  it('reruns props function after query results change via fetchMore', done => {
    const query: DocumentNode = gql`
      query people($cursor: Int) {
        allPeople(cursor: $cursor) {
          cursor
          people {
            name
          }
        }
      }
    `;
    const vars1 = { cursor: undefined };
    const data1 = {
      allPeople: { cursor: 1, people: [{ name: 'Luke Skywalker' }] }
    };
    const vars2 = { cursor: 1 };
    const data2 = {
      allPeople: { cursor: 2, people: [{ name: 'Leia Skywalker' }] }
    };

    type Data = typeof data1;
    type Variables = typeof vars1;

    const link = mockSingleLink(
      { request: { query, variables: vars1 }, result: { data: data1 } },
      { request: { query, variables: vars2 }, result: { data: data2 } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let isUpdated = false;

    type FinalProps = {
      loading: boolean;
      people?: { name: string }[];
      getMorePeople?: () => void;
    };

    const Container = graphql<{}, Data, Variables, FinalProps>(query, {
      props({ data }) {
        const { loading, allPeople, fetchMore } = data!;

        if (loading) return { loading };
        const { cursor, people } = allPeople!;
        return {
          loading: false,
          people,
          getMorePeople: () =>
            fetchMore({
              variables: { cursor },
              updateQuery(prev, { fetchMoreResult }) {
                const {
                  allPeople: { cursor, people }
                } = fetchMoreResult!;
                return {
                  allPeople: {
                    cursor,
                    people: [...people, ...prev.allPeople.people]
                  }
                };
              }
            })
        };
      }
    })(
      class extends React.Component<FinalProps> {
        render() {
          if (!this.props.loading) {
            if (isUpdated) {
              expect(this.props.people!.length).toBe(2);
              done();
            } else {
              isUpdated = true;
              expect(stripSymbols(this.props.people)).toEqual(
                data1.allPeople.people
              );
              this.props.getMorePeople!();
            }
          }

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
});
