import React from 'react';
import renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import { ApolloProvider, ChildProps, graphql } from '../../../../src';
import stripSymbols from '../../../test-utils/stripSymbols';
import createClient from '../../../test-utils/createClient';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { DocumentNode } from 'graphql';

const query: DocumentNode = gql`
  mutation addPerson {
    allPeople(first: 1) {
      people {
        name
      }
    }
  }
`;

interface Data {
  allPeople: {
    people: { name: string }[];
  };
}

interface Variables {
  name: string;
}

const expectedData = {
  allPeople: { people: [{ name: 'Luke Skywalker' }] },
};

describe('graphql(mutation)', () => {
  let error: typeof console.error;
  let client: ApolloClient<NormalizedCacheObject>;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {}); // tslint:disable-line
    client = createClient(expectedData, query);
  });
  afterEach(() => {
    console.error = error;
  });

  it('binds a mutation to props', () => {
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
    interface Props {
      methodName: string;
    }
    type InjectedProps = {
      [name: string]: (name: string) => void;
    };
    const ContainerWithData = graphql<Props, Data, Variables, InjectedProps>(query, {
      props: ({ ownProps, mutate: addPerson }) => ({
        [ownProps.methodName]: (name: string) => addPerson!({ variables: { name } }),
      }),
    })(({ myInjectedMutationMethod }) => {
      expect(myInjectedMutationMethod).toBeTruthy();
      expect(typeof myInjectedMutationMethod).toBe('function');
      return null;
    });

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData methodName="myInjectedMutationMethod" />
      </ApolloProvider>,
    );
  });

  it('does not swallow children errors', done => {
    let bar: any;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    class ErrorBoundary extends React.Component {
      componentDidCatch(e: Error) {
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
    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        componentDidMount() {
          this.props.mutate!().then(result => {
            expect(stripSymbols(result.data)).toEqual(expectedData);
            done();
          });
        }
        render() {
          return null;
        }
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('can execute a mutation with variables from props', done => {
    const queryWithVariables = gql`
      mutation addPerson($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    client = createClient(expectedData, queryWithVariables, { first: 1 });

    interface Props {
      first: number;
    }

    const Container = graphql<Props>(queryWithVariables)(
      class extends React.Component<ChildProps<Props>> {
        componentDidMount() {
          this.props.mutate!().then(result => {
            expect(stripSymbols(result.data)).toEqual(expectedData);
            done();
          });
        }
        render() {
          return null;
        }
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>,
    );
  });
});
