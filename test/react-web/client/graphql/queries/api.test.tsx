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

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

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
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount() {
        expect(this.props.data.refetch).toBeTruthy();
        expect(this.props.data.refetch instanceof Function).toBe(true);
      }
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
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
            expect(result.data).toEqual(data1);
            data
              .refetch({ first: 2 }) // new variables
              .then(response => {
                expect(response.data).toEqual(data1);
                expect(data.allPeople).toEqual(data1.allPeople);
                done();
              });
          })
          .catch(done);
      }
      render() {
        return null;
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
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
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
    class Container extends React.Component<any, any> {
      componentWillMount() {
        expect(this.props.data.fetchMore).toBeTruthy();
        expect(this.props.data.fetchMore instanceof Function).toBe(true);
      }
      componentWillReceiveProps = wrap(done, props => {
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
          expect(props.data.variables).toEqual(variables);
          expect(props.data.loading).toBe(false);
          expect(props.data.allPeople.people).toEqual(
            data.allPeople.people.concat(data1.allPeople.people),
          );
          done();
        } else {
          throw new Error('should not reach this point');
        }
        count++;
      });
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

  xit(
    'reruns props function after query results change via fetchMore',
    done => {
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
      @graphql(query, {
        // XXX: I think we should be able to avoid this https://github.com/apollostack/react-apollo/issues/197
        options: { variables: { cursor: null } },
        props({ data: { loading, allPeople, fetchMore } }) {
          if (loading) return { loading };

          const { cursor, people } = allPeople;
          return {
            people,
            getMorePeople: () =>
              fetchMore({
                variables: { cursor },
                updateQuery(prev, { fetchMoreResult }) {
                  const { allPeople: { cursor, people } } = fetchMoreResult;
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
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(props) {
          if (props.loading) return;

          if (isUpdated) {
            console.log(props.people);
            // expect(props.people.length).toBe(2);
            // done();
            return;
          }

          isUpdated = true;
          expect(props.people).toEqual(data1.allPeople.people);
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
    },
  );
});
