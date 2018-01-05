import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import { ApolloProvider, graphql } from '../../../../src';
import stripSymbols from '../../../test-utils/stripSymbols';
import createClient from '../../../test-utils/createClient';

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

describe('graphql(mutation) lifecycle', () => {
  it('allows falsy values in the mapped variables from props', done => {
    const client = createClient(expectedData, query, { id: null });

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
    const client = createClient(expectedData, query, { first: 1 });
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
    const client = createClient(expectedData, query, {
      id: null,
    });
    function options(props) {
      return {
        variables: {
          id: null,
        },
      };
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
    const client = createClient(expectedData, query, { id: 1 });
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
