
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

import graphql from '../../../src/graphql';

describe('mutations', () => {

  it('binds a mutation to props', () => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const ContainerWithData =  graphql(query)(({ addPerson }) => {
      expect(addPerson).to.exist;
      expect(addPerson).to.be.instanceof(Function);
      return null;
    });

    mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
  });

  it('does not swallow children errors', (done) => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });
    let bar;
    const ContainerWithData =  graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    try {
      mount(<ProviderMock client={client}><ContainerWithData /></ProviderMock>);
      done(new Error('component should have thrown'));
    } catch (e) {
      expect(e).to.match(/TypeError/);
      done();
    }

  });

  it('can execute a mutation', (done) => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.addPerson()
          .then(result => {
            expect(result.data).to.deep.equal(data);
            done();
          })
          .catch(done);
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

  it('can execute a mutation with variables from props', (done) => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { id: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.addPerson()
          .then(result => {
            expect(result.data).to.deep.equal(data);
            done();
          })
          .catch(done);
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container id={1} /></ProviderMock>);
  });

  it('allows falsy values in the mapped variables from props', (done) => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { id: null };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.addPerson()
          .then(result => {
            expect(result.data).to.deep.equal(data);
            done();
          })
          .catch(done);
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container id={null} /></ProviderMock>);
  });

  it('errors if the passed props don\'t contain the needed variables', () => {
    const query = gql`
      mutation addPerson($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });
    const Container =  graphql(query)(() => null);

    try {
      mount(<ProviderMock client={client}><Container frst={1} /></ProviderMock>);
    } catch (e) {
      expect(e).to.match(/Invariant Violation: The operation 'addPerson'/);
    }

  });

  it('rebuilds the mutation on prop change when using `mapPropsToOptions`', (done) => {
    const query = gql`mutation addPerson { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    function mapPropsToOptions(props) {
      expect(props.listId).to.equal(2);
      return {};
    };

    @graphql(query, mapPropsToOptions)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (props.listId !== 2) return;
        props.addPerson().then(x => done()).catch(done);
      }
      render() {
        return null;
      }
    };
    class ChangingProps extends React.Component<any, any> {
      state = { listId: 1 };

      componentDidMount() {
        setTimeout(() => this.setState({ listId: 2 }), 50);
      }

      render() {
        return <Container listId={this.state.listId} />;
      }
    }

    mount(<ProviderMock client={client}><ChangingProps /></ProviderMock>);
  });

  it('can execute a mutation with custom variables', (done) => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { id: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.addPerson({ id: 1 })
          .then(result => {
            expect(result.data).to.deep.equal(data);
            done();
          })
          .catch(done);
      }
      render() {
        return null;
      }
    };

    mount(<ProviderMock client={client}><Container /></ProviderMock>);
  });

});
