import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import assign = require('object-assign');

import ApolloClient from 'apollo-client';
import Cache from 'apollo-cache-inmemory';

declare function require(name: string);

import { mockSingleLink } from '../../../../../src/test-utils';

import { ApolloProvider, graphql } from '../../../../../src';

describe('[mutations]', () => {
  let error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {});
  });
  afterEach(() => {
    console.error = error;
  });

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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

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

  it('does not swallow children errors', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let bar;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    class ErrorBoundary extends React.Component {
      componentDidCatch(e, info) {
        expect(e.name).toMatch(/TypeError/);
        expect(e.message).toMatch(/bar is not a function/);
        done();
      }

      render() {
        return this.props.children;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <ContainerWithData />
        </ErrorBoundary>
      </ApolloProvider>,
    );
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

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
    const link = mockSingleLink({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

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
