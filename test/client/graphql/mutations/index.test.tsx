import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import {
  ApolloProvider,
  ChildProps,
  graphql,
  MutateProps,
  MutationFunc,
} from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';

describe('[mutations]', () => {
  let error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {}); // tslint:disable-line
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
    const link = mockSingleLink({
      request: { query },
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const ContainerWithData = graphql(query)(({ mutate }: MutateProps) => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface Props {
      methodName: string;
    }
    const ContainerWithData = graphql<Props>(query, {
      props: ({ ownProps, mutate: addPerson }) => ({
        [ownProps.methodName]: (name: string) =>
          addPerson({ variables: { name } }),
      }),
    })(
      ({
        myInjectedMutationMethod,
      }: ChildProps<Props> & { myInjectedMutationMethod: MutationFunc }) => {
        expect(test).toBeTruthy();
        expect(typeof test).toBe('function');
        return null;
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData methodName="myInjectedMutationMethod" />
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
    const link = mockSingleLink({
      request: { query },
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
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
        <Container id={1} />
      </ApolloProvider>,
    );
  });
});
