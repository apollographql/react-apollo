import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

import stripSymbols from '../../../test-utils/stripSymbols';
import catchAsyncError from '../../../test-utils/catchAsyncError';

describe('[queries] skip', () => {
  it('allows you to skip a query without running it', done => {
    const query = gql`
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
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let queryExecuted;
    @graphql(query, { skip: ({ skip }) => skip })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        expect(this.props.data).toBeUndefined();
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container skip={true} />
      </ApolloProvider>,
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
    const query = gql`
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
      return f(o);
    }).concat(mockSingleLink());
    // const oldQuery = link.query;
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, { skip: true })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        done();
      }
      render() {
        return null;
      }
    }

    class Parent extends React.Component<any, any> {
      state = { foo: 42 };

      componentDidMount() {
        this.setState({ foo: 43 });
      }
      render() {
        return <Container foo={this.state.foo} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it('supports using props for skipping which are used in options', done => {
    const query = gql`
      query people($id: ID!) {
        allPeople(first: $id) {
          people {
            id
          }
        }
      }
    `;

    const data = {
      allPeople: { people: { id: 1 } },
    };
    const variables = { id: 1 };
    const link = mockSingleLink({
      request: { query, variables },
      result: { data },
    });

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    let renderCount = 0;

    interface Props {
      person: any;
    }
    @graphql<Props>(query, {
      skip: ({ person }) => !person,
      options: ({ person }) => ({
        variables: {
          id: person.id,
        },
      }),
    })
    class Container extends React.Component<any> {
      componentWillReceiveProps(props) {
        count++;
        if (count === 1) expect(props.data.loading).toBeTruthy();
        if (count === 2)
          expect(stripSymbols(props.data.allPeople)).toEqual(data.allPeople);
        if (count === 2) {
          expect(renderCount).toBe(2);
          done();
        }
      }
      render() {
        renderCount++;
        return null;
      }
    }

    class Parent extends React.Component<any, any> {
      state = { person: null };

      componentDidMount() {
        this.setState({ person: { id: 1 } });
      }
      render() {
        return <Container person={this.state.person} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it("doesn't run options or props when skipped, including option.client", done => {
    const query = gql`
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
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let queryExecuted;
    let optionsCalled;

    interface Props {
      pollInterval: number;
      skip: boolean;
    }

    @graphql<Props>(query, {
      skip: ({ skip }) => skip,
      options: props => {
        optionsCalled = true;
        return {
          pollInterval: props.pollInterval,
        };
      },
      props: ({ willThrowIfAccesed }: any) => ({
        // intentionally incorrect
        pollInterval: willThrowIfAccesed.pollInterval,
      }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        expect(this.props.data).toBeFalsy();
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container skip={true} />
      </ApolloProvider>,
    );

    setTimeout(() => {
      if (!queryExecuted) {
        done();
        return;
      }
      if (optionsCalled) {
        fail(new Error('options ruan even through skip present'));
        return;
      }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  it("doesn't run options or props when skipped even if the component updates", done => {
    const query = gql`
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
      result: {},
    });

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let queryWasSkipped = true;

    @graphql(query, {
      skip: true,
      options: () => {
        queryWasSkipped = false;
        return {};
      },
      props: () => {
        queryWasSkipped = false;
        return {};
      },
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(queryWasSkipped).toBeTruthy();
        done();
      }
      render() {
        return null;
      }
    }

    class Parent extends React.Component<any, any> {
      state = { foo: 'bar' };
      componentDidMount() {
        this.setState({ foo: 'baz' });
      }
      render() {
        return <Container foo={this.state.foo} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it('allows you to skip a query without running it (alternate syntax)', done => {
    const query = gql`
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
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let queryExecuted;
    @graphql(query, { skip: true })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        expect(this.props.data).toBeFalsy();
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
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
    const query = gql`
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
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let hasSkipped = false;
    @graphql(query, { skip: ({ skip }) => skip })
    class Container extends React.Component<any, any> {
      8;
      componentWillReceiveProps(newProps) {
        if (newProps.skip) {
          hasSkipped = true;
          this.props.setSkip(false);
        } else {
          if (hasSkipped) {
            done();
          } else {
            this.props.setSkip(true);
          }
        }
      }
      render() {
        return null;
      }
    }

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

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it('allows you to skip then unskip a query with new options (top-level syntax)', done => {
    const query = gql`
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
    const link = mockSingleLink(
      {
        request: { query, variables: { first: 1 } },
        result: { data: dataOne },
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: dataTwo },
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: dataTwo },
      },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let hasSkipped = false;
    @graphql(query, { skip: ({ skip }) => skip })
    class Container extends React.Component<any, any> {
      8;
      componentWillReceiveProps(newProps) {
        if (newProps.skip) {
          hasSkipped = true;
          // change back to skip: false, with a different variable
          this.props.setState({ skip: false, first: 2 });
        } else {
          if (hasSkipped) {
            if (!newProps.data.loading) {
              expect(stripSymbols(newProps.data.allPeople)).toEqual(
                dataTwo.allPeople,
              );
              done();
            }
          } else {
            expect(stripSymbols(newProps.data.allPeople)).toEqual(
              dataOne.allPeople,
            );
            this.props.setState({ skip: true });
          }
        }
      }
      render() {
        return null;
      }
    }

    class Parent extends React.Component<any, any> {
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

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it('allows you to skip then unskip a query with opts syntax', done => {
    const query = gql`
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
      return f(o);
    }).concat(
      mockSingleLink({
        request: { query },
        result: { data },
        newData: () => ({ data: nextData }),
      }),
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let hasSkipped = false;
    let hasRequeried = false;

    interface Props {
      skip: boolean;
    }
    @graphql<Props>(query, {
      options: () => ({ fetchPolicy: 'network-only' }),
      skip: ({ skip }) => skip,
    })
    class Container extends React.Component<any> {
      componentWillReceiveProps(newProps) {
        if (newProps.skip) {
          // Step 2. We shouldn't query again.
          expect(ranQuery).toBe(1);
          hasSkipped = true;
          this.props.setSkip(false);
        } else if (hasRequeried) {
          // Step 4. We need to actually get the data from the query into the component!
          expect(newProps.data.loading).toBeFalsy();
          done();
        } else if (hasSkipped) {
          // Step 3. We need to query again!
          expect(newProps.data.loading).toBeTruthy();
          expect(ranQuery).toBe(2);
          hasRequeried = true;
        } else {
          // Step 1.  We've queried once.
          expect(ranQuery).toBe(1);
          this.props.setSkip(true);
        }
      }
      render() {
        return null;
      }
    }

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

    renderer.create(
      <ApolloProvider client={client}>
        <Parent />
      </ApolloProvider>,
    );
  });

  it('removes the injected props if skip becomes true', done => {
    let count = 0;
    const query = gql`
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

    const link = mockSingleLink(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
      { request: { query, variables: variables3 }, result: { data: data3 } },
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, {
      skip: () => count === 1,
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        catchAsyncError(done, () => {
          // loading is true, but data still there
          if (count === 0)
            expect(stripSymbols(data.allPeople)).toEqual(data1.allPeople);
          if (count === 1) expect(data).toBeUndefined();
          if (count === 2 && !data.loading) {
            expect(stripSymbols(data.allPeople)).toEqual(data3.allPeople);
            done();
          }
        });
      }
      render() {
        return null;
      }
    }

    class ChangingProps extends React.Component<any, any> {
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

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  it('allows you to unmount a skipped query', done => {
    const query = gql`
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
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, {
      skip: true,
    })
    class Container extends React.Component<any, any> {
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

    class Hider extends React.Component<any, any> {
      state = { hide: false };
      render() {
        if (this.state.hide) {
          return null;
        }
        return <Container hide={() => this.setState({ hide: true })} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Hider />
      </ApolloProvider>,
    );
  });
});
