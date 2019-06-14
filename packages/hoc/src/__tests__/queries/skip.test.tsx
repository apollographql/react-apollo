import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('[queries] skip', () => {
  afterEach(cleanup);

  it('allows you to skip a query without running it', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    interface Props {
      skip: boolean;
    }

    let queryExecuted = false;
    const Container = graphql<Props>(query, {
      skip: ({ skip }) => skip
    })(
      class extends React.Component<ChildProps<Props>> {
        componentDidUpdate() {
          queryExecuted = true;
        }
        render() {
          expect(this.props.data).toBeUndefined();
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container skip={true} />
      </ApolloProvider>
    );

    setTimeout(() => {
      if (!queryExecuted) {
        done();
        return;
      }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  it('continues to not subscribe to a skipped query when props change', done => {
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
      done.fail(new Error('query ran even though skip present'));
      return f ? f(o) : null;
    }).concat(mockSingleLink());
    // const oldQuery = link.query;
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Props {
      foo: number;
    }

    const Container = graphql<Props>(query, { skip: true })(
      class extends React.Component<ChildProps<Props>> {
        componentDidUpdate() {
          done();
        }
        render() {
          return null;
        }
      }
    );

    class Parent extends React.Component<{}, { foo: number }> {
      state = { foo: 42 };

      componentDidMount() {
        this.setState({ foo: 43 });
      }
      render() {
        return <Container foo={this.state.foo} />;
      }
    }

    render(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>
    );
  });

  it('supports using props for skipping which are used in options', done => {
    const query: DocumentNode = gql`
      query people($id: ID!) {
        allPeople(first: $id) {
          people {
            id
          }
        }
      }
    `;

    const data = {
      allPeople: { people: { id: 1 } }
    };

    type Data = typeof data;

    const variables = { id: 1 };
    type Vars = typeof variables;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data }
    });

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let count = 0;
    let renderCount = 0;

    interface Props {
      person: { id: number } | null;
    }
    const Container = graphql<Props, Data, Vars>(query, {
      skip: ({ person }) => !person,
      options: ({ person }) => ({
        variables: {
          id: person!.id
        }
      })
    })(
      class extends React.Component<ChildProps<Props, Data, Vars>> {
        componentDidUpdate() {
          const { props } = this;
          count++;
          if (count === 1) expect(props.data!.loading).toBeTruthy();
          if (count === 2)
            expect(stripSymbols(props.data!.allPeople)).toEqual(data.allPeople);
          if (count === 2) {
            expect(renderCount).toBe(3);
            done();
          }
        }
        render() {
          renderCount++;
          return null;
        }
      }
    );

    class Parent extends React.Component<
      {},
      { person: { id: number } | null }
    > {
      state = { person: null };

      componentDidMount() {
        this.setState({ person: { id: 1 } });
      }
      render() {
        return <Container person={this.state.person} />;
      }
    }

    render(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>
    );
  });

  it("doesn't run options or props when skipped, including option.client", done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let queryExecuted = false;
    let optionsCalled = false;

    interface Props {
      skip: boolean;
      pollInterval?: number;
    }

    interface FinalProps {
      pollInterval: number;
      data?: {};
    }

    const Container = graphql<Props, {}, {}, FinalProps>(query, {
      skip: ({ skip }) => skip,
      options: props => {
        optionsCalled = true;
        return {
          pollInterval: props.pollInterval
        };
      },
      props: props => ({
        // intentionally incorrect
        pollInterval: (props as any).willThrowIfAccesed.pollInterval
      })
    })(
      class extends React.Component<FinalProps & Props> {
        componentDidUpdate() {
          queryExecuted = true;
        }
        render() {
          expect(this.props.data).toBeFalsy();
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container skip={true} />
      </ApolloProvider>
    );

    setTimeout(() => {
      if (!queryExecuted) {
        done();
        return;
      }
      if (optionsCalled) {
        fail(new Error('options ran even though skip present'));
        return;
      }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  it("doesn't run options or props when skipped even if the component updates", done => {
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
      result: {}
    });

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let queryWasSkipped = true;

    interface Props {
      foo: string;
    }
    const Container = graphql<Props>(query, {
      skip: true,
      options: () => {
        queryWasSkipped = false;
        return {};
      },
      props: () => {
        queryWasSkipped = false;
        return {};
      }
    })(
      class extends React.Component<ChildProps<Props>> {
        componentDidUpdate() {
          expect(queryWasSkipped).toBeTruthy();
          done();
        }
        render() {
          return null;
        }
      }
    );

    class Parent extends React.Component<{}, { foo: string }> {
      state = { foo: 'bar' };
      componentDidMount() {
        this.setState({ foo: 'baz' });
      }
      render() {
        return <Container foo={this.state.foo} />;
      }
    }

    render(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>
    );
  });

  it('allows you to skip a query without running it (alternate syntax)', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let queryExecuted = false;
    const Container = graphql(query, { skip: true })(
      class extends React.Component<ChildProps> {
        componentDidUpdate() {
          queryExecuted = true;
        }
        render() {
          expect(this.props.data).toBeFalsy();
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );

    setTimeout(() => {
      if (!queryExecuted) {
        done();
        return;
      }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  // test the case of skip:false -> skip:true -> skip:false to make sure things
  // are cleaned up properly
  it('allows you to skip then unskip a query with top-level syntax', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let hasSkipped = false;

    interface Props {
      skip: boolean;
      setSkip: (skip: boolean) => void;
    }

    const Container = graphql<Props>(query, { skip: ({ skip }) => skip })(
      class extends React.Component<ChildProps<Props>> {
        componentDidUpdate(prevProps: ChildProps<Props>) {
          if (this.props.skip) {
            hasSkipped = true;
            prevProps.setSkip(false);
          } else {
            if (hasSkipped) {
              done();
            } else {
              prevProps.setSkip(true);
            }
          }
        }
        render() {
          return null;
        }
      }
    );

    class Parent extends React.Component<any, any> {
      state = { skip: false };
      render() {
        return (
          <Container
            skip={this.state.skip}
            setSkip={skip => this.setState({ skip })}
          />
        );
      }
    }

    render(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>
    );
  });

  it('allows you to skip then unskip a query with new options (top-level syntax)', done => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const dataOne = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const dataTwo = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };

    type Data = typeof dataOne;
    type Vars = { first: number };

    const link = mockSingleLink(
      {
        request: { query, variables: { first: 1 } },
        result: { data: dataOne }
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: dataTwo }
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: dataTwo }
      }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let hasSkipped = false;

    interface Props {
      skip: boolean;
      first: number;
      setState: <K extends 'skip' | 'first'>(
        state: Pick<{ skip: boolean; first: number }, K>
      ) => void;
    }
    const Container = graphql<Props, Data, Vars>(query, {
      skip: ({ skip }) => skip
    })(
      class extends React.Component<ChildProps<Props, Data, Vars>> {
        componentDidUpdate(prevProps: ChildProps<Props, Data, Vars>) {
          if (this.props.skip) {
            hasSkipped = true;
            // change back to skip: false, with a different variable
            prevProps.setState({ skip: false, first: 2 });
          } else {
            if (hasSkipped) {
              if (!this.props.data!.loading) {
                expect(stripSymbols(this.props.data!.allPeople)).toEqual(
                  dataTwo.allPeople
                );
                done();
              }
            } else {
              expect(stripSymbols(this.props.data!.allPeople)).toEqual(
                dataOne.allPeople
              );
              prevProps.setState({ skip: true });
            }
          }
        }
        render() {
          return null;
        }
      }
    );

    class Parent extends React.Component<{}, { skip: boolean; first: number }> {
      state = { skip: false, first: 1 };
      render() {
        return (
          <Container
            skip={this.state.skip}
            first={this.state.first}
            setState={state => this.setState(state)}
          />
        );
      }
    }

    render(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>
    );
  });

  it('allows you to skip then unskip a query with opts syntax', done => {
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
    const nextData = { allPeople: { people: [{ name: 'Anakin Skywalker' }] } };

    let ranQuery = 0;

    const link = new ApolloLink((o, f) => {
      ranQuery++;
      return f ? f(o) : null;
    }).concat(
      mockSingleLink({
        request: { query },
        result: { data },
        newData: () => ({ data: nextData })
      })
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
      queryDeduplication: false
    });

    interface Props {
      skip: boolean;
      setSkip: (skip: boolean) => void;
    }
    let count = 0;
    const Container = graphql<Props>(query, {
      options: {
        fetchPolicy: 'network-only',
        notifyOnNetworkStatusChange: true
      },
      skip: ({ skip }) => skip
    })(
      class extends React.Component<any> {
        render() {
          switch (count) {
            case 0:
              expect(this.props.data.loading).toBeTruthy();
              expect(ranQuery).toBe(1);
              break;
            case 1:
              expect(this.props.data.loading).toBeFalsy();
              expect(ranQuery).toBe(1);
              setTimeout(() => {
                this.props.setSkip(true);
              });
              break;
            case 2:
              expect(this.props.data).toBeUndefined();
              expect(ranQuery).toBe(1);
              setTimeout(() => {
                this.props.setSkip(false);
              });
              break;
            case 3:
              expect(this.props.data!.loading).toBeTruthy();
              expect(ranQuery).toBe(2);
              break;
            case 4:
              expect(this.props.data!.loading).toBeFalsy();
              done();
              break;
            default:
          }
          count += 1;
          return null;
        }
      }
    );

    class Parent extends React.Component<{}, { skip: boolean }> {
      state = { skip: false };
      render() {
        return (
          <Container
            skip={this.state.skip}
            setSkip={skip => this.setState({ skip })}
          />
        );
      }
    }

    render(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>
    );
  });

  it('removes the injected props if skip becomes true', done => {
    let count = 0;
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    const data3 = { allPeople: { people: [{ name: 'Anakin Skywalker' }] } };
    const variables3 = { first: 3 };

    type Data = typeof data1;
    type Vars = typeof variables1;

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
      { request: { query, variables: variables3 }, result: { data: data3 } }
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql<Vars, Data>(query, {
      skip: () => count === 1
    })(
      class extends React.Component<ChildProps<Vars, Data>> {
        componentDidUpdate() {
          const { data } = this.props;
          try {
            // loading is true, but data still there
            if (count === 0)
              expect(stripSymbols(data!.allPeople)).toEqual(data1.allPeople);
            if (count === 1) expect(data).toBeUndefined();
            if (count === 2 && !data!.loading) {
              expect(stripSymbols(data!.allPeople)).toEqual(data3.allPeople);
              done();
            }
          } catch (error) {
            done.fail(error);
          }
        }
        render() {
          return null;
        }
      }
    );

    class ChangingProps extends React.Component<{}, { first: number }> {
      state = { first: 1 };
      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);

        setTimeout(() => {
          count++;
          this.setState({ first: 3 });
        }, 100);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    render(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>
    );
  });

  it('allows you to unmount a skipped query', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const link = mockSingleLink();
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Props {
      hide: () => void;
    }

    const Container = graphql<Props>(query, {
      skip: true
    })(
      class extends React.Component<ChildProps<Props>> {
        componentDidMount() {
          this.props.hide();
        }
        componentWillUnmount() {
          done();
        }
        render() {
          return null;
        }
      }
    );

    class Hider extends React.Component<{}, { hide: boolean }> {
      state = { hide: false };
      render() {
        if (this.state.hide) {
          return null;
        }
        return <Container hide={() => this.setState({ hide: true })} />;
      }
    }

    render(
      <ApolloProvider client={client}>
        <Hider />
      </ApolloProvider>
    );
  });
});
