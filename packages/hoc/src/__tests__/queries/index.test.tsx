import React from 'react';
import PropTypes from 'prop-types';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps, DataProps } from '@apollo/react-hoc';

describe('queries', () => {
  let error: typeof console.error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {});
  });

  afterEach(() => {
    console.error = error;
    cleanup();
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Data {
      allPeople?: {
        people: { name: string }[];
      };
    }

    const ContainerWithData = graphql<any, Data>(query)(
      ({ data }: DataProps<Data>) => {
        expect(data).toBeTruthy();
        expect(data.loading).toBeTruthy();
        return null;
      }
    );

    render(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>
    );
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
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
      }
    );

    render(
      <ApolloProvider client={client}>
        <ContainerWithData first={1} />
      </ApolloProvider>
    );
  });

  it('should update query variables when props change', () => {
    const query: DocumentNode = gql`
      query people($someId: ID) {
        allPeople(someId: $someId) {
          people {
            name
          }
        }
      }
    `;

    const link = mockSingleLink(
      {
        request: { query, variables: { someId: 1 } },
        result: {
          data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } }
        }
      },
      {
        request: { query, variables: { someId: 2 } },
        result: { data: { allPeople: { people: [{ name: 'Darth Vader' }] } } }
      }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Data {
      allPeople: {
        people: {
          name: string;
        };
      };
    }

    interface Variables {
      someId: number;
    }

    const options = {
      options: {}
    };

    let count = 0;
    const ContainerWithData = graphql<Variables, Data, Variables>(
      query,
      options
    )(({ data }: ChildProps<Variables, Data, Variables>) => {
      expect(data).toBeTruthy();
      if (count === 0) {
        expect(data!.variables.someId).toEqual(1);
      } else if (count === 1) {
        expect(data!.variables.someId).toEqual(2);
      }
      count += 1;
      return null;
    });

    const { rerender } = render(
      <ApolloProvider client={client}>
        <ContainerWithData someId={1} />
      </ApolloProvider>
    );
    rerender(
      <ApolloProvider client={client}>
        <ContainerWithData someId={2} />
      </ApolloProvider>
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
        `
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
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidUpdate() {
          const { props } = this;
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          done();
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
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
      otherPeople: { people: [{ name: 'Luke Skywalker' }] }
    };
    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidUpdate() {
          const { props } = this;
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          expect(stripSymbols(props.data!.otherPeople)).toEqual(
            data.otherPeople
          );
          done();
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
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
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<Vars, Data, Vars>(query)(
      class extends React.Component<ChildProps<Vars, Data, Vars>> {
        componentDidUpdate() {
          const { props } = this;
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          expect(stripSymbols(props.data!.variables)).toEqual(
            this.props.data!.variables
          );
          done();
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>
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
          variables
        },
        result: {
          data
        }
      }
    ];
    const link = mockSingleLink.apply(null, mocks);
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    const options = {
      options: {
        variables: {
          jedi: true,
          first: 1
        }
      }
    };

    const Container = graphql<{}, Data, Vars>(query, options)(
      class extends React.Component<ChildProps<{}, Data, Vars>> {
        componentDidUpdate() {
          const { props } = this;
          try {
            expect(props.data!.loading).toBeFalsy();
            expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
            done();
          } catch (error) {
            done.fail(error);
          }
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
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
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<Partial<Vars>, Data, Vars>(query)(
      class extends React.Component<ChildProps<Partial<Vars>, Data, Vars>> {
        componentDidUpdate() {
          const { props } = this;
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          done();
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container first={null} />
      </ApolloProvider>
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
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    const Container = graphql<Vars, Data>(query)(() => null);

    let errorCaught = null;
    try {
      render(
        <ApolloProvider client={client}>
          <Container first={1} />
        </ApolloProvider>
      );
    } catch (e) {
      errorCaught = e;
    }

    expect(errorCaught).toBeNull();
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
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentDidUpdate() {
          const { props } = this;
          expect(props.data!.loading).toBeFalsy();
          expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
        }
        render() {
          return <div>{this.props.children}</div>;
        }
      }
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
      color: PropTypes.string
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
      color: PropTypes.string
    };

    render(
      <ApolloProvider client={client}>
        <ContextContainer>
          <Container>
            <ChildContextContainer />
          </Container>
        </ContextContainer>
      </ApolloProvider>
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
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<{}, Data>(query)(
      class Container extends React.Component<ChildProps<{}, Data>> {
        componentDidUpdate() {
          const queries = client.queryManager!.queryStore.getStore();
          const queryIds = Object.keys(queries);
          expect(queryIds.length).toEqual(1);
          const queryFirst = queries[queryIds[0]];
          expect(queryFirst.metadata).toEqual({
            reactComponent: {
              displayName: 'Apollo(Container)'
            }
          });
          done();
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
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
      alias: 'withFoo'
    })
    class Container extends React.Component<any, any> {
      render(): React.ReactNode {
        return null;
      }
    }
    // );

    // Not sure why I have to cast Container to any
    expect((Container as any).displayName).toEqual('withFoo(Container)');
  });

  it('passes context to the link', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const link = new ApolloLink((o, f) => {
      expect(o.getContext().fromProps).toBe(true);
      done();
      return f ? f(o) : null;
    }).concat(
      mockSingleLink({
        request: { query },
        result: {
          data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } }
        }
      })
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Data {
      allPeople?: {
        people: { name: string }[];
      };
    }

    const ContainerWithData = graphql<any, Data>(query, {
      options: props => ({ context: { fromProps: props.context } })
    })(() => null);

    render(
      <ApolloProvider client={client}>
        <ContainerWithData context={true} />
      </ApolloProvider>
    );
  });

  describe('Return partial data', () => {
    it('should not return partial cache data when `returnPartialData` is false', () => {
      const cache = new Cache();
      const client = new ApolloClient({
        cache,
        link: ApolloLink.empty()
      });

      const fullQuery = gql`
        query {
          cars {
            make
            model
            repairs {
              date
              description
            }
          }
        }
      `;

      cache.writeQuery({
        query: fullQuery,
        data: {
          cars: [
            {
              __typename: 'Car',
              make: 'Ford',
              model: 'Mustang',
              vin: 'PONY123',
              repairs: [
                {
                  __typename: 'Repair',
                  date: '2019-05-08',
                  description: 'Could not get after it.'
                }
              ]
            }
          ]
        }
      });

      const partialQuery = gql`
        query {
          cars {
            repairs {
              date
              cost
            }
          }
        }
      `;

      const ComponentWithData = graphql<any, any>(partialQuery)(
        class Compnent extends React.Component<any> {
          render() {
            expect(this.props.data.cars).toBeUndefined();
            return null;
          }
        }
      );

      const App = () => (
        <ApolloProvider client={client}>
          <ComponentWithData />
        </ApolloProvider>
      );

      render(<App />);
    });

    it('should return partial cache data when `returnPartialData` is true', () => {
      const cache = new Cache();
      const client = new ApolloClient({
        cache,
        link: ApolloLink.empty()
      });

      const fullQuery = gql`
        query {
          cars {
            make
            model
            repairs {
              date
              description
            }
          }
        }
      `;

      cache.writeQuery({
        query: fullQuery,
        data: {
          cars: [
            {
              __typename: 'Car',
              make: 'Ford',
              model: 'Mustang',
              vin: 'PONY123',
              repairs: [
                {
                  __typename: 'Repair',
                  date: '2019-05-08',
                  description: 'Could not get after it.'
                }
              ]
            }
          ]
        }
      });

      const partialQuery = gql`
        query {
          cars {
            repairs {
              date
              cost
            }
          }
        }
      `;

      const ComponentWithData = graphql<any, any>(partialQuery, {
        options: {
          returnPartialData: true
        }
      })(
        class Compnent extends React.Component<any> {
          render() {
            expect(this.props.data.cars).toEqual([
              {
                __typename: 'Car',
                repairs: [
                  {
                    __typename: 'Repair',
                    date: '2019-05-08'
                  }
                ]
              }
            ]);
            return null;
          }
        }
      );

      const App = () => (
        <ApolloProvider client={client}>
          <ComponentWithData />
        </ApolloProvider>
      );

      render(<App />);
    });
  });
});
