
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';

import ApolloClient, { createFragment } from 'apollo-client';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../src/test-utils';

import { ApolloProvider, graphql } from '../../../../src';

describe('fragments', () => {

  // XXX in a later version, we should support this for composition
  it('throws if you only pass a fragment', () => {
    const query = gql`
      fragment Failure on PeopleConnection { people { name } }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
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
      };

      renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/TypeError/);
    }
  });

  it('correctly fetches a query with inline fragments', (done) => {
    const query = gql`
      query people { allPeople(first: 1) { __typename ...person } }
      fragment person on PeopleConnection { people { name } }
    `;
    const data = { allPeople: {
      __typename: 'PeopleConnection', people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
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
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('correctly merges a query with inline fragments and passed fragments', (done) => {
    const query = gql`
      query peopleAndShips {
        allPeople(first: 1) {
          __typename
          ...Person
        }
        allShips(first: 1) {
          __typename
          ...ships
        }
      }
      fragment Person on PeopleConnection { people { name } }
    `;
    const shipFragment = createFragment(gql`
      fragment ships on ShipsConnection { starships { name } }
    `);

    const mockedQuery = gql`
      query peopleAndShips {
        allPeople(first: 1) {
          __typename
          ...Person
        }
        allShips(first: 1) {
          __typename
          ...ships
        }
      }
      fragment Person on PeopleConnection { people { name } }
      fragment ships on ShipsConnection { starships { name } }
    `;

    const data = {
      allPeople: { __typename: 'PeopleConnection', people: [ { name: 'Luke Skywalker' } ] },
      allShips: { __typename: 'ShipsConnection', starships: [ { name: 'CR90 corvette' } ] },
    };
    const networkInterface = mockNetworkInterface(
      { request: { query: mockedQuery }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      options: () => ({ fragments: shipFragment }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
        expect(props.data.allShips).toEqual(data.allShips);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('correctly allows for passed fragments', (done) => {
    const query = gql`
      query ships { allShips(first: 1) { __typename ...Ships } }
    `;
    const shipFragment = createFragment(gql`
      fragment Ships on ShipsConnection { starships { name } }
    `);

    const mockedQuery = gql`
      query ships { allShips(first: 1) { __typename ...Ships } }
      fragment Ships on ShipsConnection { starships { name } }
    `;

    const data = {
      allShips: { __typename: 'ShipsConnection', starships: [ { name: 'CR90 corvette' } ] },
    };
    const networkInterface = mockNetworkInterface(
      { request: { query: mockedQuery }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      options: () => ({ fragments: shipFragment}),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allShips).toEqual(data.allShips);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('correctly allows for passed fragments in an array', (done) => {
    const query = gql`
      query ships { allShips(first: 1) { __typename ...Ships } }
    `;
    const shipFragment = createFragment(gql`
      fragment Ships on ShipsConnection { starships { name } }
    `);

    const mockedQuery = gql`
      query ships { allShips(first: 1) { __typename ...Ships } }
      fragment Ships on ShipsConnection { starships { name } }
    `;

    const data = {
      allShips: { __typename: 'ShipsConnection', starships: [ { name: 'CR90 corvette' } ] },
    };
    const networkInterface = mockNetworkInterface(
      { request: { query: mockedQuery }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      options: () => ({ fragments: [shipFragment]}),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allShips).toEqual(data.allShips);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });


});
