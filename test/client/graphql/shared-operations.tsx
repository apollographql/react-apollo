
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import mockNetworkInterface from '../../mocks/mockNetworkInterface';
import {
  // Passthrough,
  ProviderMock,
} from '../../mocks/components';

import graphql, { withApollo } from '../../../src/graphql';

describe('shared opertations', () => {

  describe('withApollo', () => {
    it('passes apollo-client to props', () => {

      const client = new ApolloClient();

      @withApollo
      class ContainerWithData extends React.Component<any, any> {
        render() {
          expect(this.props.client).to.deep.equal(client);
          return null;
        }
      }

      mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
    });
  });

  it('binds two queries to props', () => {
    const peopleQuery = gql`query people { allPeople(first: 1) { people { name } } }`;
    const peopleData = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };

    const shipsQuery = gql`query ships { allships(first: 1) { ships { name } } }`;
    const shipsData = { allships: { ships: [ { name: 'Tie Fighter' } ] } };


    const networkInterface = mockNetworkInterface(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: shipsQuery }, result: { data: shipsData } }
    );
    const client = new ApolloClient({ networkInterface });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withShips = graphql(shipsQuery, { name: 'ships' });

    @withPeople
    @withShips
    class ContainerWithData extends React.Component<any, any> {
      render() {
        const { people, ships } = this.props;
        expect(people).to.exist;
        expect(people.loading).to.be.true;

        expect(ships).to.exist;
        expect(ships.loading).to.be.true;
        return null;
      }
    }

    const wrapper = mount(<ProviderMock client={client} ><ContainerWithData /></ProviderMock>);
    (wrapper as any).unmount();
  });

  it('binds two queries to props with different syntax', () => {
    const peopleQuery = gql`query people { allPeople(first: 1) { people { name } } }`;
    const peopleData = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };

    const shipsQuery = gql`query ships { allships(first: 1) { ships { name } } }`;
    const shipsData = { allships: { ships: [ { name: 'Tie Fighter' } ] } };


    const networkInterface = mockNetworkInterface(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: shipsQuery }, result: { data: shipsData } }
    );
    const client = new ApolloClient({ networkInterface });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withShips = graphql(shipsQuery, { name: 'ships' });

    const ContainerWithData = withPeople(withShips((props) => {
      const { people, ships } = props;
      expect(people).to.exist;
      expect(people.loading).to.be.true;

      expect(ships).to.exist;
      expect(ships.loading).to.be.true;
      return null;
    }));

    const wrapper = mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
    (wrapper as any).unmount();
  });

  it('binds two operations to props', () => {
    const peopleQuery = gql`query people { allPeople(first: 1) { people { name } } }`;
    const peopleData = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };

    const peopleMutation = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const peopleMutationData = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };

    const networkInterface = mockNetworkInterface(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: peopleMutation }, result: { data: peopleMutationData } }
    );
    const client = new ApolloClient({ networkInterface });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withPeopleMutation = graphql(peopleMutation, { name: 'addPerson' });

    @withPeople
    @withPeopleMutation
    class ContainerWithData extends React.Component<any, any> {
      render() {
        const { people, addPerson } = this.props;
        expect(people).to.exist;
        expect(people.loading).to.be.true;

        expect(addPerson).to.exist;
        return null;
      }
    }

    const wrapper = mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
    (wrapper as any).unmount();
  });

});
