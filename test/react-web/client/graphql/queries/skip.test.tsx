/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { NetworkInterface } from 'apollo-client';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../../src';

// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = (done: Function, cb: (...args: any[]) => any) => (
  ...args: any[]
) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('[queries] skip', () => {
  // skip
  it('allows you to skip a query (deprecated)', done => {
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
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let queryExecuted;
    @graphql(query, { options: () => ({ skip: true }) })
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
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
    const networkInterface = mockNetworkInterface();
    const oldQuery = networkInterface.query;

    networkInterface.query = function(request) {
      fail(new Error('query ran even though skip present'));
      return oldQuery.call(this, request);
    };
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
      constructor() {
        super();
        this.state = { foo: 42 };
      }
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
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });

    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0,
      renderCount = 0;
    @graphql(query, {
      skip: ({ person }) => !person,
      options: ({ person }) => ({
        variables: {
          id: person.id,
        },
      }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        count++;
        if (count === 1) expect(props.data.loading).toBe(true);
        if (count === 2) expect(props.data.allPeople).toEqual(data.allPeople);
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
      constructor() {
        super();
        this.state = { person: null };
      }
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
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let queryExecuted;
    let optionsCalled;
    @graphql(query, {
      skip: ({ skip }) => skip,
      options: props => {
        optionsCalled = true;
        return {
          pollInterval: props.pollInterval,
        };
      },
      props: ({ willThrowIfAccesed }) => ({
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
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
      constructor() {
        super();
        this.state = { skip: false };
      }
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
    const networkInterface = mockNetworkInterface(
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
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
              expect(newProps.data.allPeople).toEqual(dataTwo.allPeople);
              done();
            }
          } else {
            expect(newProps.data.allPeople).toEqual(dataOne.allPeople);
            this.props.setState({ skip: true });
          }
        }
      }
      render() {
        return null;
      }
    }

    class Parent extends React.Component<any, any> {
      constructor() {
        super();
        this.state = { skip: false, first: 1 };
      }
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
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
      newData: () => ({ data: nextData }),
    });
    const oldQuery = networkInterface.query;

    let ranQuery = 0;
    networkInterface.query = function(request) {
      ranQuery++;
      return oldQuery.call(this, request);
    };
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let hasSkipped = false;
    let hasRequeried = false;
    @graphql(query, {
      options: ({ skip }) => ({ skip, fetchPolicy: 'network-only' }),
    })
    class Container extends React.Component<any, any> {
      8;
      componentWillReceiveProps(newProps) {
        if (newProps.skip) {
          // Step 2. We shouldn't query again.
          expect(ranQuery).toBe(1);
          hasSkipped = true;
          this.props.setSkip(false);
        } else if (hasRequeried) {
          // Step 4. We need to actually get the data from the query into the component!
          expect(newProps.data.loading).toBe(false);
          done();
        } else if (hasSkipped) {
          // Step 3. We need to query again!
          expect(newProps.data.loading).toBe(true);
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
      constructor() {
        super();
        this.state = { skip: false };
      }
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

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
      { request: { query, variables: variables3 }, result: { data: data2 } },
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      skip: () => count === 1,
      options: props => ({ variables: props }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        try {
          // loading is true, but data still there
          if (count === 0) expect(data.allPeople).toEqual(data1.allPeople);
          if (count === 1) expect(data).toBeUndefined();
          if (count === 2 && !data.loading) {
            expect(data.allPeople).toEqual(data2.allPeople);
            done();
          }
        } catch (e) {
          console.log({ e });
        }
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
    const networkInterface = mockNetworkInterface();
    const client = new ApolloClient({ networkInterface, addTypename: false });

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
      constructor() {
        super();
        this.state = { hide: false };
      }
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
