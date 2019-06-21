import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('fragments', () => {
  afterEach(cleanup);

  // XXX in a later version, we should support this for composition
  it('throws if you only pass a fragment', () => {
    const query: DocumentNode = gql`
      fragment Failure on PeopleConnection {
        people {
          name
        }
      }
    `;
    const expectedData = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] }
    };
    type Data = typeof expectedData;

    const link = mockSingleLink({
      request: { query },
      result: { data: expectedData }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    try {
      const Container = graphql<{}, Data>(query)(
        class extends React.Component<ChildProps<{}, Data>> {
          componentDidUpdate() {
            const { props } = this;
            expect(props.data!.loading).toBeFalsy();
            expect(stripSymbols(props.data!.allPeople)).toEqual(
              expectedData.allPeople
            );
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
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/Invariant Violation/);
    }
  });

  it('correctly fetches a query with inline fragments', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          __typename
          ...person
        }
      }

      fragment person on PeopleConnection {
        people {
          name
        }
      }
    `;
    const data = {
      allPeople: {
        __typename: 'PeopleConnection',
        people: [{ name: 'Luke Skywalker' }]
      }
    };

    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidUpdate() {
          expect(this.props.data!.loading).toBeFalsy();
          expect(stripSymbols(this.props.data!.allPeople)).toEqual(
            data.allPeople
          );
          done();
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
