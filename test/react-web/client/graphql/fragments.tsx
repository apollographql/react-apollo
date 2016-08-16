
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import gql from 'graphql-tag';

import ApolloClient, { createFragment } from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import mockNetworkInterface from '../../../mocks/mockNetworkInterface';
import {
  // Passthrough,
  ProviderMock,
} from '../../../mocks/components';

import graphql from '../../../../src/graphql';

describe('fragments', () => {

  // XXX in a later version, we should support this for composition
  it('throws if you only pass a fragment', (done) => {
    const query = gql`
      fragment Failure on PeopleConnection { people { name } }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    try {
      @graphql(query)
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(props) {
          expect(props.data.loading).to.be.false;
          expect(props.data.allPeople).to.deep.equal(data.allPeople);
          done();
        }
        render() {
          return null;
        }
      };

      mount(<ProviderMock client={client}><Container /></ProviderMock>)
      done(new Error('This should throw'))
    } catch (e) {
      // expect(e).to.match(/Invariant Violation/);
      done();
    }
  });

  it('correctly fetches a query with inline fragments', (done) => {
    const query = gql`
      query people { allPeople(first: 1) { ...person } }
      fragment person on PeopleConnection { people { name } }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).to.be.false;
        expect(props.data.allPeople).to.deep.equal(data.allPeople);
        done();
      }
      render() {
        return null;
      }
    };

    expect((Container as any).fragments.length).to.equal(1);

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('correctly merges a query with inline fragments and passed fragments', (done) => {
    const query = gql`
      query peopleAndShips {
        allPeople(first: 1) { ...Person }
        allShips(first: 1) { ...ships }
      }
      fragment Person on PeopleConnection { people { name } }
    `;
    const shipFragment = createFragment(gql`
      fragment ships on ShipsConnection { starships { name } }
    `);

    const mockedQuery = gql`
      query peopleAndShips {
        allPeople(first: 1) { ...Person }
        allShips(first: 1) { ...ships }
      }
      fragment Person on PeopleConnection { people { name } }
      fragment ships on ShipsConnection { starships { name } }
    `;

    const data = {
      allPeople: { people: [ { name: 'Luke Skywalker' } ] },
      allShips: { starships: [ { name: 'CR90 corvette' } ] },
    };
    const networkInterface = mockNetworkInterface(
      { request: { query: mockedQuery }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface });

    @graphql(query, {
      options: () => ({ fragments: [shipFragment]})
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).to.be.false;
        expect(props.data.allPeople).to.deep.equal(data.allPeople);
        expect(props.data.allShips).to.deep.equal(data.allShips);
        done();
      }
      render() {
        return null;
      }
    };

    expect((Container as any).fragments.length).to.equal(1);

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('correctly allows for passed fragments', (done) => {
    const query = gql`
      query ships { allShips(first: 1) { ...Ships } }
    `;
    const shipFragment = createFragment(gql`
      fragment Ships on ShipsConnection { starships { name } }
    `);

    const mockedQuery = gql`
      query ships { allShips(first: 1) { ...Ships } }
      fragment Ships on ShipsConnection { starships { name } }
    `;

    const data = {
      allShips: { starships: [ { name: 'CR90 corvette' } ] },
    };
    const networkInterface = mockNetworkInterface(
      { request: { query: mockedQuery }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface });

    @graphql(query, {
      options: () => ({ fragments: [shipFragment]}),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).to.be.false;
        expect(props.data.allShips).to.deep.equal(data.allShips);
        done();
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });


});
