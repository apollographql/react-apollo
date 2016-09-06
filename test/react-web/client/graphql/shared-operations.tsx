
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import TestUtils = require('react-addons-test-utils');

import ApolloClient from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import mockNetworkInterface from '../../../mocks/mockNetworkInterface';
import {
  // Passthrough,
  ProviderMock,
} from '../../../mocks/components';

import graphql, { withApollo } from '../../../../src/graphql';
import { compose } from '../../../../src/';

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

  it('allows a way to access the wrapped component instance', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const testData = { foo: 'bar' };

    class Container extends React.Component<any, any> {
      someMethod() {
        return testData;
      }

      render() {
        return <span></span>;
      }
    }

    const Decorated = graphql(query, { withRef: true })(Container);

    const tree = TestUtils.renderIntoDocument(
      <ProviderMock client={client}>
        <Decorated />
      </ProviderMock>
    ) as any;

    const decorated = TestUtils.findRenderedComponentWithType(tree, Decorated);

    expect(() => (decorated as any).someMethod()).to.throw();
    expect((decorated as any).getWrappedInstance().someMethod()).to.deep.equal(testData);
    expect((decorated as any).refs.wrappedInstance.someMethod()).to.deep.equal(testData);

  });

  it('allows options to take an object', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    let queryExecuted;
    @graphql(query, { options: { skip: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        expect(this.props.data.loading).to.be.false;
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);

    setTimeout(() => {
      if (!queryExecuted) { done(); return; }
      done(new Error('query ran even though skip present'));
    }, 25);
  });

  describe('compose', () => {
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

      const enhanced = compose(
        graphql(peopleQuery, { name: 'people' }),
        graphql(shipsQuery, { name: 'ships' })
      );

      const ContainerWithData = enhanced((props) => {
        const { people, ships } = props;
        expect(people).to.exist;
        expect(people.loading).to.be.true;

        expect(ships).to.exist;
        expect(ships.loading).to.be.true;
        return null;
      });

      const wrapper = mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
      (wrapper as any).unmount();
    });
  });

});
