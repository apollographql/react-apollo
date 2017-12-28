import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';

describe('[queries] updateQuery', () => {
  // updateQuery
  it('exposes updateQuery as part of the props api', done => {
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

    @graphql(query)
    class Container extends React.Component<any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.updateQuery).toBeTruthy();
        expect(data.updateQuery instanceof Function).toBeTruthy();
        try {
          data.updateQuery(() => done());
        } catch (error) {
          // fail
        }
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

  it('exposes updateQuery as part of the props api during componentWillMount', done => {
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

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount() {
        expect(this.props.data.updateQuery).toBeTruthy();
        expect(this.props.data.updateQuery instanceof Function).toBeTruthy();
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

  it('updateQuery throws if called before data has returned', done => {
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

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount() {
        expect(this.props.data.updateQuery).toBeTruthy();
        expect(this.props.data.updateQuery instanceof Function).toBeTruthy();
        try {
          this.props.data.updateQuery();
          done();
        } catch (e) {
          expect(e.toString()).toMatch(
            /ObservableQuery with this id doesn't exist:/,
          );
          done();
        }
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

  it('allows updating query results after query has finished (early binding)', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data: data1 } },
      { request: { query }, result: { data: data2 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let isUpdated;
    @graphql(query)
    class Container extends React.Component<any, any> {
      public updateQuery: any;
      componentWillMount() {
        this.updateQuery = this.props.data.updateQuery;
      }
      componentWillReceiveProps(props) {
        if (isUpdated) {
          expect(stripSymbols(props.data.allPeople)).toEqual(data2.allPeople);
          done();
          return;
        } else {
          isUpdated = true;
          this.updateQuery(prev => {
            return data2;
          });
        }
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

  it('allows updating query results after query has finished', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data: data1 } },
      { request: { query }, result: { data: data2 } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let isUpdated;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (isUpdated) {
          expect(stripSymbols(props.data.allPeople)).toEqual(data2.allPeople);
          done();
          return;
        } else {
          isUpdated = true;
          props.data.updateQuery(prev => {
            return data2;
          });
        }
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
