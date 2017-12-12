import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { withState } from 'recompose';
import { mockSingleLink } from '../../../../../src/test-utils';
import {
  ApolloProvider,
  ChildProps,
  graphql,
  OptionProps,
} from '../../../../../src';
import '../../../../setup/toEqualWithoutSymbol';

// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = (done: Function, cb: (...args: any[]) => any) => (
  ...args: any[]
) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};

describe('[queries] api', () => {
  // api
  it('exposes refetch as part of the props api', done => {
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
    const link = mockSingleLink(
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables: { first: 2 } }, result: { data: data1 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let hasRefetched,
      count = 0;

    interface Props {
      first: number;
    }
    interface Data {
      allPeople: { people: [{ name: string }] };
    }

    @graphql<Props, Data>(query)
    class Container extends React.Component<ChildProps<Props, Data>> {
      componentWillMount() {
        expect(this.props.data.refetch).toBeTruthy();
        expect(this.props.data.refetch instanceof Function).toBe(true);
      }
      componentWillReceiveProps({ data }: ChildProps<Props, Data>) {
        try {
          if (count === 0) expect(data.loading).toBe(false); // first data
          if (count === 1) expect(data.loading).toBe(true); // first refetch
          if (count === 2) expect(data.loading).toBe(false); // second data
          if (count === 3) expect(data.loading).toBe(true); // second refetch
          if (count === 4) expect(data.loading).toBe(false); // third data
          count++;
          if (hasRefetched) return;
          hasRefetched = true;
          expect(data.refetch).toBeTruthy();
          expect(data.refetch instanceof Function).toBe(true);
          data
            .refetch()
            .then(result => {
              expect(result.data).toEqualWithoutSymbol(data1);
              return data
                .refetch({ first: 2 }) // new variables
                .then(response => {
                  expect(response.data).toEqualWithoutSymbol(data1);
                  expect(data.allPeople).toEqualWithoutSymbol(data1.allPeople);
                  done();
                });
            })
            .catch(done.fail);
        } catch (e) {
          done.fail(e);
        }
      }
      render() {
        return <div>{this.props.first}</div>;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>,
    );
  });

  it('exposes subscribeToMore as part of the props api', done => {
    const query = gql`
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

    // example of loose typing
    @graphql(query)
    class Container extends React.Component<any> {
      componentWillReceiveProps({ data }: OptionProps) {
        // tslint:disable-line
        expect(data.subscribeToMore).toBeTruthy();
        expect(data.subscribeToMore instanceof Function).toBe(true);
        done();
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

  it('exposes fetchMore as part of the props api', done => {
    const query = gql`
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
    const variables = { skip: 1, first: 1 };
    const variables2 = { skip: 2, first: 1 };

    const link = mockSingleLink(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data1 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    @graphql(query, { options: () => ({ variables }) })
    class Container extends React.Component<any> {
      componentWillMount() {
        expect(this.props.data.fetchMore).toBeTruthy();
        expect(this.props.data.fetchMore instanceof Function).toBe(true);
      }
      componentWillReceiveProps(props: OptionProps) {
        if (count === 0) {
          expect(props.data.fetchMore).toBeTruthy();
          expect(props.data.fetchMore instanceof Function).toBe(true);
          props.data
            .fetchMore({
              variables: { skip: 2 },
              updateQuery: (prev, { fetchMoreResult }) => ({
                allPeople: {
                  people: prev.allPeople.people.concat(
                    fetchMoreResult.allPeople.people,
                  ),
                },
              }),
            })
            .then(
              wrap(done, result => {
                expect(result.data.allPeople.people).toEqual(
                  data1.allPeople.people,
                );
              }),
            );
        } else if (count === 1) {
          expect(props.data.variables).toEqualWithoutSymbol(variables);
          expect(props.data.loading).toBe(false);
          expect(props.data.allPeople.people).toEqualWithoutSymbol(
            data.allPeople.people.concat(data1.allPeople.people),
          );
          done();
        } else {
          throw new Error('should not reach this point');
        }
        count++;
        done();
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

  it('reruns props function after query results change via fetchMore', done => {
    const query = gql`
      query people($cursor: Int) {
        allPeople(cursor: $cursor) {
          cursor
          people {
            name
          }
        }
      }
    `;
    const vars1 = { cursor: null };
    const data1 = {
      allPeople: { cursor: 1, people: [{ name: 'Luke Skywalker' }] },
    };
    const vars2 = { cursor: 1 };
    const data2 = {
      allPeople: { cursor: 2, people: [{ name: 'Leia Skywalker' }] },
    };
    const link = mockSingleLink(
      { request: { query, variables: vars1 }, result: { data: data1 } },
      { request: { query, variables: vars2 }, result: { data: data2 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let isUpdated = false;

    interface Props {}
    interface Data {
      allPeople: {
        cursor: any;
        people: [{ name: string }];
      };
    }
    @graphql<Props, Data>(query, {
      props({
        data: { loading, allPeople, fetchMore },
      }: ChildProps<Props, Data>) {
        if (loading) return { loading };
        const { cursor, people } = allPeople;
        return {
          people,
          getMorePeople: () =>
            fetchMore({
              variables: { cursor },
              updateQuery(prev, { fetchMoreResult }) {
                const { allPeople: { cursor, people } } = fetchMoreResult; // tslint:disable-line:no-shadowed-variable
                return {
                  allPeople: {
                    cursor,
                    people: [...people, ...prev.allPeople.people],
                  },
                };
              },
            }),
        };
      },
    })
    class Container extends React.Component<ChildProps<Props, Data>> {
      componentWillReceiveProps(props) {
        if (props.loading) return;

        if (isUpdated) {
          expect(props.people.length).toBe(2);
          done();
          return;
        }

        isUpdated = true;
        expect(props.people).toEqualWithoutSymbol(data1.allPeople.people);
        props.getMorePeople();
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
});
