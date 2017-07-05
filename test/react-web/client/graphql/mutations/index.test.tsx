import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import assign = require('object-assign');

import ApolloClient from 'apollo-client';

declare function require(name: string)

import { mockNetworkInterface } from '../../../../../src/test-utils';

import { ApolloProvider, graphql } from '../../../../../src';

describe('[mutations]', () => {
  it('binds a mutation to props', () => {
    const query = gql`
      mutation addPerson {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const ContainerWithData = graphql(query)(({ mutate }) => {
      expect(mutate).toBeTruthy();
      expect(typeof mutate).toBe('function');
      return null;
    });

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });

  it('binds a mutation to custom props', () => {
    const query = gql`
      mutation addPerson {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const props = ({ ownProps, addPerson }) => ({
      [ownProps.methodName]: (name: string) =>
        addPerson({ variables: { name } }),
    });

    const ContainerWithData = graphql(query, { props })(({ test }) => {
      expect(test).toBeTruthy();
      expect(typeof test).toBe('function');
      return null;
    });

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData methodName="test" />
      </ApolloProvider>,
    );
  });

  it('does not swallow children errors', () => {
    const query = gql`
      mutation addPerson {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let bar;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    try {
      renderer.create(
        <ApolloProvider client={client}>
          <ContainerWithData />
        </ApolloProvider>,
      );
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/TypeError/);
    }
  });

  it('can execute a mutation', done => {
    const query = gql`
      mutation addPerson {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate().then(result => {
          expect(result.data).toEqual(data);
          done();
        });
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

  it('can execute a mutation with variables from props', done => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables = { id: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate().then(result => {
          expect(result.data).toEqual(data);
          done();
        });
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container id={1} />
      </ApolloProvider>,
    );
  });
});
