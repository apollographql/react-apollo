import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import {
  ApolloProvider,
  ChildProps,
  graphql,
  MutateProps,
  MutationFunc,
} from '../../../../src';
import stripSymbols from '../../../test-utils/stripSymbols';
import createClient from '../../../test-utils/createClient';

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

describe('graphql(mutation)', () => {
  let error;
  let client;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {}); // tslint:disable-line
    client = createClient(expectedData, query);
  });
  afterEach(() => {
    console.error = error;
  });

  it('binds a mutation to props', () => {
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
    @graphql(queryWithVariables)
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
        <Container first={1} />
      </ApolloProvider>,
    );
  });
});
