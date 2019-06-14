import React from 'react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { render, cleanup } from '@testing-library/react';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('[queries] updateQuery', () => {
  afterEach(cleanup);

  // updateQuery
  it('exposes updateQuery as part of the props api', done => {
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

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        componentDidUpdate() {
          const { data } = this.props;
          expect(data!.updateQuery).toBeTruthy();
          expect(data!.updateQuery instanceof Function).toBeTruthy();
          try {
            data!.updateQuery(() => done());
          } catch (error) {
            // fail
          }
        }
        render() {
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

  it('exposes updateQuery as part of the props api during componentWillMount', done => {
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

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        render() {
          expect(this.props.data!.updateQuery).toBeTruthy();
          expect(this.props.data!.updateQuery instanceof Function).toBeTruthy();
          done();
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

  it('updateQuery throws if called before data has returned', done => {
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

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        render() {
          expect(this.props.data!.updateQuery).toBeTruthy();
          expect(this.props.data!.updateQuery instanceof Function).toBeTruthy();
          try {
            this.props.data!.updateQuery(p => p);
            done();
          } catch (e) {
            expect(e.toString()).toMatch(
              /ObservableQuery with this id doesn't exist:/
            );
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

  it('allows updating query results after query has finished (early binding)', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;
    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data: data1 } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let isUpdated = false;
    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        public updateQuery: any;
        componentDidUpdate() {
          if (isUpdated) {
            expect(stripSymbols(this.props.data!.allPeople)).toEqual(
              data2.allPeople
            );
            done();
            return;
          } else {
            isUpdated = true;
            this.updateQuery(() => {
              return data2;
            });
          }
        }
        render() {
          this.updateQuery = this.props.data!.updateQuery;

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

  it('allows updating query results after query has finished', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data: data1 } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let isUpdated = false;
    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidUpdate() {
          if (isUpdated) {
            expect(stripSymbols(this.props.data!.allPeople)).toEqual(
              data2.allPeople
            );
            done();
            return;
          } else {
            isUpdated = true;
            this.props.data!.updateQuery(() => {
              return data2;
            });
          }
        }
        render() {
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
