import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';

import ApolloClient, { createFragment } from 'apollo-client';

declare function require(name: string)

import { mockNetworkInterface } from '../../../../src/test-utils';

import { ApolloProvider, graphql } from '../../../../src';

describe('fragments', () => {
  // XXX in a later version, we should support this for composition
  it('throws if you only pass a fragment', () => {
    const query = gql`
      fragment Failure on PeopleConnection {
        people {
          name
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    try {
      @graphql(query)
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(props) {
          expect(props.data.loading).toBe(false);
          expect(props.data.allPeople).toEqual(data.allPeople);
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
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/Invariant Violation/);
    }
  });

  it('correctly fetches a query with inline fragments', done => {
    const query = gql`
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
        people: [{ name: 'Luke Skywalker' }],
      },
    };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
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
});
