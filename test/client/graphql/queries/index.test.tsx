import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql, DataProps, ChildProps } from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';
import catchAsyncError from '../../../test-utils/catchAsyncError';
import { DocumentNode } from 'graphql';

describe('queries', () => {
  let error: typeof console.error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {}); // tslint:disable-line
  });
  afterEach(() => {
    console.error = error;
  });

  // general api
  it('binds a query to props', () => {
    const query: DocumentNode = gql`
      query people {
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

    interface Data {
      allPeople?: {
        people: { name: string }[];
      };
    }

    const ContainerWithData = graphql<any, Data>(query)(({ data }: DataProps<Data>) => {
      expect(data).toBeTruthy();
      expect(data.loading).toBeTruthy();
      return null;
    });

    const output = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    output.unmount();
  });

  it('includes the variables in the props', () => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const variables = { first: 1 };
    const link = mockSingleLink({
      request: { query, variables },
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    // Ensure variable types work correctly here

    interface Data {
      allPeople: {
        people: {
          name: string;
        };
      };
    }

    interface Variables {
      first: number;
    }

    const ContainerWithData = graphql<Variables, Data, Variables>(query)(
      ({ data }: ChildProps<Variables, Data, Variables>) => {
        expect(data).toBeTruthy();
        expect(data!.variables).toEqual(variables);
        return null;
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData first={1} />
      </ApolloProvider>,
    );
  });

  it("shouldn't warn about fragments", () => {
    const oldWarn = console.warn;
    const warnings: any[] = [];
    console.warn = (str: any) => warnings.push(str);

    try {
      graphql(
        gql`
          query foo {
            bar
          }
        `,
      );
      expect(warnings.length).toEqual(0);
    } finally {
      console.warn = oldWarn;
    }
  });

  it('executes a query', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillReceiveProps(props: ChildProps<{}, Data>) {
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          done();
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

  it('executes a query with two root fields', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
        otherPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] },
      otherPeople: { people: [{ name: 'Luke Skywalker' }] },
    };
    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillReceiveProps(props: ChildProps<{}, Data>) {
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          expect(stripSymbols(props.data!.otherPeople)).toEqual(data.otherPeople);
          done();
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

  it('maps props as variables if they match', done => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const variables = { first: 1 };
    type Vars = typeof variables;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        componentWillReceiveProps(props: ChildProps<Vars, Data, Vars>) {
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          expect(stripSymbols(props.data!.variables)).toEqual(this.props.data!.variables);
          done();
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

  it("doesn't care about the order of variables in a request", done => {
    const query: DocumentNode = gql`
      query people($first: Int, $jedi: Boolean) {
        allPeople(first: $first, jedi: $jedi) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;
    const variables = { jedi: true, first: 1 };
    type Vars = typeof variables;

    const mocks = [
      {
        request: {
          query,
          variables,
        },
        result: {
          data,
        },
      },
    ];
    const link = mockSingleLink.apply(null, mocks);
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    const options = {
      options: {
        variables: {
          jedi: true,
          first: 1,
        },
      },
    };

    const Container = graphql<{}, Data, Vars>(query, options)(
      class extends React.Component<ChildProps<{}, Data, Vars>> {
        componentWillReceiveProps(props: ChildProps<{}, Data, Vars>) {
          catchAsyncError(done, () => {
            expect(props.data!.loading).toBeFalsy();
            expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
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

  it('allows falsy values in the mapped variables from props', done => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const variables = { first: null };
    type Vars = typeof variables;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<Partial<Vars>, Data, Vars>(query)(
      class extends React.Component<ChildProps<Partial<Vars>, Data, Vars>> {
        componentWillReceiveProps(props: ChildProps<Partial<Vars>, Data, Vars>) {
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          done();
        }
        render() {
          return null;
        }
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Container first={null} />
      </ApolloProvider>,
    );
  });

  it("doesn't error on optional required props", () => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const variables = { first: 1 };
    type Vars = typeof variables;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    const Container = graphql<Vars, Data>(query)(() => null);

    let errorCaught = null;
    try {
      renderer.create(
        <ApolloProvider client={client}>
          <Container first={1} />
        </ApolloProvider>,
      );
    } catch (e) {
      errorCaught = e;
    }

    expect(errorCaught).toBeNull();
  });

  // note this should log an error in the console until they are all cleaned up with react 16
  it("errors if the passed props don't contain the needed variables", done => {
    const query: DocumentNode = gql`
      query people($first: Int!) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const variables = { first: 1 };
    type Vars = typeof variables;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface WrongProps {
      frst: number;
    }
    const Container = graphql<WrongProps, Data, Vars>(query)(() => null);
    class ErrorBoundary extends React.Component {
      componentDidCatch(e: Error) {
        expect(e.name).toMatch(/Invariant Violation/);
        expect(e.message).toMatch(/The operation 'people'/);
        done();
      }

      render() {
        return this.props.children;
      }
    }
    renderer.create(
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <Container frst={1} />
        </ErrorBoundary>
      </ApolloProvider>,
    );
  });

  // context
  it('allows context through updates', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillReceiveProps(props: ChildProps<{}, Data>) {
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
        }
        render() {
          return <div>{this.props.children}</div>;
        }
      },
    );

    class ContextContainer extends React.Component<{}, { color: string }> {
      constructor(props: {}) {
        super(props);
        this.state = { color: 'purple' };
      }

      getChildContext() {
        return { color: this.state.color };
      }

      componentDidMount() {
        setTimeout(() => {
          this.setState({ color: 'green' });
        }, 50);
      }

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    (ContextContainer as any).childContextTypes = {
      color: PropTypes.string,
    };

    let count = 0;
    class ChildContextContainer extends React.Component<any, any> {
      render() {
        const { color } = this.context as any;
        if (count === 0) expect(color).toBe('purple');
        if (count === 1) {
          expect(color).toBe('green');
          done();
        }

        count++;
        return <div>{this.props.children}</div>;
      }
    }

    (ChildContextContainer as any).contextTypes = {
      color: PropTypes.string,
    };

    renderer.create(
      <ApolloProvider client={client}>
        <ContextContainer>
          <Container>
            <ChildContextContainer />
          </Container>
        </ContextContainer>
      </ApolloProvider>,
    );
  });

  // meta
  it('stores the component name in the query metadata', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<{}, Data>(query)(
      // tslint:disable-next-line:no-shadowed-variable
      class Container extends React.Component<ChildProps<{}, Data>> {
        componentWillReceiveProps() {
          const queries = client.queryManager.queryStore.getStore();
          const queryIds = Object.keys(queries);
          expect(queryIds.length).toEqual(1);
          const queryFirst = queries[queryIds[0]];
          expect(queryFirst.metadata).toEqual({
            reactComponent: {
              displayName: 'Apollo(Container)',
            },
          });
          done();
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

  it("uses a custom wrapped component name when 'alias' is specified", () => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    @graphql(query, {
      alias: 'withFoo',
    })
    class Container extends React.Component<any, any> {
      render(): React.ReactNode {
        return null;
      }
    }

    // Not sure why I have to cast Container to any
    expect((Container as any).displayName).toEqual('withFoo(Container)');
  });
});
