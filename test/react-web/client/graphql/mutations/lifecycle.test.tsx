import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../../src';

import stripSymbols from '../../../../test-utils/stripSymbols';

describe('[mutations] lifecycle', () => {
  it('allows falsy values in the mapped variables from props', done => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) {
          people {
            name
          }
        }
      }
    `;
    const expectedData = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] },
    };
    const variables = { id: null };
    const link = mockSingleLink({
      request: { query, variables },
      result: { data: expectedData },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate().then(result => {
          expect(stripSymbols(result.data)).toEqual(expectedData);
          done();
        });
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container id={null} />
      </ApolloProvider>,
    );
  });

  it("errors if the passed props don't contain the needed variables", () => {
    const query = gql`
      mutation addPerson($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const expectedData = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] },
    };
    const variables = { first: 1 };
    const link = mockSingleLink({
      request: { query, variables },
      result: { data: expectedData },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    const Container = graphql(query)(() => null);

    try {
      renderer.create(
        <ApolloProvider client={client}>
          <Container frst={1} />
        </ApolloProvider>,
      );
    } catch (e) {
      expect(e).toMatch(/Invariant Violation: The operation 'addPerson'/);
    }
  });

  it('rebuilds the mutation on prop change when using `options`', done => {
    const query = gql`
      mutation addPerson {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const expectedData = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] },
    };
    const link = mockSingleLink({
      request: { query },
      result: { data: expectedData },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    function options(props) {
      // expect(props.listId).toBe(2);
      return {};
    }

    @graphql(query, { options })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (props.listId !== 2) return;
        props.mutate().then(x => done());
      }
      render() {
        return null;
      }
    }
    class ChangingProps extends React.Component<any, any> {
      state = { listId: 1 };

      componentDidMount() {
        setTimeout(() => this.setState({ listId: 2 }), 50);
      }

      render() {
        return <Container listId={this.state.listId} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  it('can execute a mutation with custom variables', done => {
    const query = gql`
      mutation addPerson($id: Int) {
        allPeople(id: $id) {
          people {
            name
          }
        }
      }
    `;
    const expectedData = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] },
    };
    const variables = { id: 1 };
    const link = mockSingleLink({
      request: { query, variables },
      result: { data: expectedData },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentDidMount() {
        this.props.mutate({ variables: { id: 1 } }).then(result => {
          expect(stripSymbols(result.data)).toEqual(expectedData);
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
});
