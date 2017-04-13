/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { NetworkInterface } from 'apollo-client/transport/networkInterface';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../src/test-utils';
import { ApolloProvider, graphql} from '../../../../src';

// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = (done: Function, cb: (...args: any[]) => any) => (...args: any[]) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('queries', () => {

  it('binds a query to props', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const ContainerWithData = graphql(query)(({ data }) => { // tslint:disable-line
      expect(data).toBeTruthy();
      expect(data.ownProps).toBeFalsy();
      expect(data.loading).toBe(true);
      return null;
    });

    const output = renderer.create(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
    output.unmount();
  });

  it("shouldn't warn about fragments", () => {
    const oldWarn = console.warn;
    const warnings = [];
    console.warn = (str) => warnings.push(str);

    try {
      graphql(gql`query foo { bar }`);
      expect(warnings.length).toEqual(0);
    } finally {
      console.warn = oldWarn;
    }
  });

  it('includes the variables in the props', () => {
    const query = gql`query people ($first: Int) { allPeople(first: $first) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const ContainerWithData =  graphql(query)(({ data }) => { // tslint:disable-line
      expect(data).toBeTruthy();;
      expect(data.variables).toEqual(variables);
      return null;
    });

    renderer.create(<ApolloProvider client={client}><ContainerWithData first={1} /></ApolloProvider>);
  });

  it('does not swallow children errors', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let bar;
    const ContainerWithData =  graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    try {
      renderer.create(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/TypeError/);
    }

  });

  it('executes a query', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('executes a query with two root fields', (done) => {
    const query = gql`query people {
      allPeople(first: 1) { people { name } }
      otherPeople(first: 1) { people { name } }
    }`;
    const data = {
      allPeople: { people: [ { name: 'Luke Skywalker' } ] },
      otherPeople: { people: [ { name: 'Luke Skywalker' } ] },
    };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
        expect(props.data.otherPeople).toEqual(data.otherPeople);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('can unmount without error', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const ContainerWithData =  graphql(query)(() => null);

    const wrapper = renderer.create(
      <ApolloProvider client={client}><ContainerWithData /></ApolloProvider>
    ) as any;

    try {
      wrapper.unmount();
      done();
    } catch (e) { throw new Error(e); }
  });

  it('passes any GraphQL errors in props', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const networkInterface = mockNetworkInterface({ request: { query }, error: new Error('boo') });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class ErrorContainer extends React.Component<any, any> {
      componentWillReceiveProps({ data }) { // tslint:disable-line
        expect(data.error).toBeTruthy();
        expect(data.error.networkError).toBeTruthy();
        // expect(data.error instanceof ApolloError).toBe(true);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><ErrorContainer /></ApolloProvider>);
  });

  describe('uncaught exceptions', () => {
    let unhandled = [];
    function handle(reason) {
      unhandled.push(reason);
    }
    beforeEach(() => {
      unhandled = [];
      process.on('unhandledRejection', handle);
    });
    afterEach(() => {
      process.removeListener('unhandledRejection', handle);
    });

    it('does not log when you change variables resulting in an error', (done) => {
      const query = gql`query people($var: Int) { allPeople(first: $var) { people { name } } }`;
      const var1 = { var: 1 };
      const data = { allPeople : { people: { name: 'Luke Skywalker' } } };
      const var2 = { var: 2 };
      const networkInterface = mockNetworkInterface({
        request: { query, variables: var1 }, result: { data },
      }, {
        request: { query, variables: var2 }, error: new Error('boo'),
      });
      const client = new ApolloClient({ networkInterface, addTypename: false });

      let iteration = 0;
      @withState('var', 'setVar', 1)
      @graphql(query)
      class ErrorContainer extends React.Component<any, any> {
        componentWillReceiveProps(props) { // tslint:disable-line
          iteration += 1;
          if (iteration === 1) {
            expect(props.data.allPeople).toEqual(data.allPeople)
            props.setVar(2);
          } else if (iteration === 2) {
            expect(props.data.loading).toBeTruthy();
          } else if (iteration === 3) {
            expect(props.data.error).toBeTruthy();
            expect(props.data.error.networkError).toBeTruthy();
            // We need to set a timeout to ensure the unhandled rejection is swept up
            setTimeout(() => {
              expect(unhandled.length).toEqual(0);
              done()
            }, 0);
          }
        }
        render() {
          return null;
        }
      };

      renderer.create(<ApolloProvider client={client}><ErrorContainer /></ApolloProvider>);
    });
  });

  it('maps props as variables if they match', (done) => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
        expect(props.data.variables).toEqual(this.props.data.variables);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container first={1} /></ApolloProvider>);
  });

  it('allows falsy values in the mapped variables from props', (done) => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: null };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container first={null} /></ApolloProvider>);
  });

  it('don\'t error on optional required props', () => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    const Container =  graphql(query)(() => null);

    let error = null;
    try {
      renderer.create(<ApolloProvider client={client}><Container first={1} /></ApolloProvider>);
    } catch (e) { error = e; }

    expect(error).toBeNull();

  });

  it('errors if the passed props don\'t contain the needed variables', () => {
    const query = gql`
      query people($first: Int!) {
        allPeople(first: $first) { people { name } }
      }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    const Container =  graphql(query)(() => null);

    try {
      renderer.create(<ApolloProvider client={client}><Container frst={1} /></ApolloProvider>);
    } catch (e) {
      expect(e.name).toMatch(/Invariant Violation/);
      expect(e.message).toMatch(/The operation 'people'/);
    }

  });

  it('rebuilds the queries on prop change when using `options`', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });


    let firstRun = true;
    let isDone = false;
    function options(props) {
      if (!firstRun) {
        expect(props.listId).toBe(2);
        if (!isDone) done();
        isDone = true;
      }
      return {};
    };

    const Container = graphql(query, { options })((props) => null);

    class ChangingProps extends React.Component<any, any> {
      state = { listId: 1 };

      componentDidMount() {
        setTimeout(() => {
          firstRun = false;
          this.setState({ listId: 2 });
        }, 50);
      }

      render() {
        return <Container listId={this.state.listId} />;
      }
    }

    renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  });

  it('allows you to skip a query (deprecated)', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
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
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);

    setTimeout(() => {
      if (!queryExecuted) { done(); return; }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  it('allows you to skip a query without running it', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
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
    };

    renderer.create(<ApolloProvider client={client}><Container skip={true} /></ApolloProvider>);

    setTimeout(() => {
      if (!queryExecuted) { done(); return; }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  it('continues to not subscribe to a skipped query when props change', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const networkInterface = mockNetworkInterface();
    const oldQuery = networkInterface.query;

    networkInterface.query = function (request) {
      fail(new Error('query ran even though skip present'));
      return oldQuery.call(this, request);
    };
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { skip: true })
    class Container extends React.Component<any, any> {8
      componentWillReceiveProps(props) {
        done();
      }
      render() {
        return null;
      }
    };

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
    };

    renderer.create(<ApolloProvider client={client}><Parent /></ApolloProvider>);
  });

  it('doesn\'t run options or props when skipped', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let queryExecuted;
    @graphql(query, {
      skip: ({ skip }) => skip,
      options: ({ willThrowIfAccesed }) => ({ pollInterval: willThrowIfAccesed.pollInterval }),
      props: ({ willThrowIfAccesed }) => ({ pollInterval: willThrowIfAccesed.pollInterval }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        expect(this.props.data).toBeFalsy();
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container skip={true} /></ApolloProvider>);

    setTimeout(() => {
      if (!queryExecuted) { done(); return; }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  it('allows you to skip a query without running it (alternate syntax)', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
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
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);

    setTimeout(() => {
      if (!queryExecuted) { done(); return; }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  // test the case of skip:false -> skip:true -> skip:false to make sure things
  // are cleaned up properly
  it('allows you to skip then unskip a query with top-level syntax', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let hasSkipped = false;
    @graphql(query, { skip: ({ skip }) => skip })
    class Container extends React.Component<any, any> {8
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
    };

    class Parent extends React.Component<any, any> {
      constructor() {
        super();
        this.state = { skip: false };
      }
      render() {
        return <Container skip={this.state.skip} setSkip={(skip) => this.setState({ skip })} />;
      }
    };

    renderer.create(<ApolloProvider client={client}><Parent /></ApolloProvider>);
  });

  it('allows you to skip then unskip a query with new options (top-level syntax)', (done) => {
    const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
    const dataOne = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const dataTwo = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables: { first: 1 } }, result: { data: dataOne } },
      { request: { query, variables: { first: 2 } }, result: { data: dataTwo } },
      { request: { query, variables: { first: 2 } }, result: { data: dataTwo } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let hasSkipped = false;
    @graphql(query, { skip: ({ skip }) => skip })
    class Container extends React.Component<any, any> {8
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
    };

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
            setState={(state) => this.setState(state)}
          />
        );
      }
    };

    renderer.create(<ApolloProvider client={client}><Parent /></ApolloProvider>);
  });

  it('allows you to skip then unskip a query with opts syntax', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const nextData = { allPeople: { people: [ { name: 'Anakin Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({
      request: { query }, result: { data }, newData: () => ({ data: nextData }) });
    const oldQuery = networkInterface.query;

    let ranQuery = 0;
    networkInterface.query = function (request) {
      ranQuery++;
      return oldQuery.call(this, request);
    };
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let hasSkipped = false;
    let hasRequeried = false;
    @graphql(query, { options: ({ skip }) => ({ skip, fetchPolicy: 'network-only' }) })
    class Container extends React.Component<any, any> {8
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
    };

    class Parent extends React.Component<any, any> {
      constructor() {
        super();
        this.state = { skip: false };
      }
      render() {
        return <Container skip={this.state.skip} setSkip={(skip) => this.setState({ skip })} />;
      }
    };

    renderer.create(<ApolloProvider client={client}><Parent /></ApolloProvider>);
  });


  it('removes the injected props if skip becomes true', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };


    const data3 = { allPeople: { people: [ { name: 'Anakin Skywalker' } ] } };
    const variables3 = { first: 3 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
      { request: { query, variables: variables3 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      skip: () => count === 1,
      options: (props) => ({ variables: props }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 0) expect(data.allPeople).toEqual(data1.allPeople);
        if (count === 1 ) expect(data).toBeFalsy();
        if (count === 2 && data.loading) expect(data.allPeople).toBeFalsy();
        if (count === 2 && !data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

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

    renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  });


  it('allows you to unmount a skipped query', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
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
    };

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

    renderer.create(<ApolloProvider client={client}><Hider /></ApolloProvider>);
  });


  it('reruns the query if it changes', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      options: (props) => ({ variables: props, fetchPolicy: count === 0 ? 'cache-and-network' : 'cache-first' }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 1 && data.loading) {
          expect(data.allPeople).toEqual(data1.allPeople);
        }
        if (count === 1 && !data.loading && this.props.data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  });

  // XXX broken in AC 0.4.20
  // it('correctly unsubscribes', (done) => {
  //   let count = 0;
  //   const query = gql`
  //     query people($first: Int) {
  //       allPeople(first: $first) { people { name } }
  //     }
  //   `;

  //   const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
  //   const variables1 = { first: 1 };

  //   const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
  //   const variables2 = { first: 2 };

  //   const networkInterface = mockNetworkInterface(
  //     { request: { query, variables: variables1 }, result: { data: data1 } },
  //     { request: { query, variables: variables2 }, result: { data: data2 } }
  //   );

  //   const client = new ApolloClient({ networkInterface, addTypename: false });
  //   const Container = graphql(query)(() => null);

  //   @connect(state => ({ apollo: state.apollo }))
  //   class ChangingProps extends React.Component<any, any> {
  //     state = { first: 1 };

  //     componentDidMount() {
  //       setTimeout(() => {
  //         count++;
  //         this.setState({ first: 0 });
  //       }, 50);

  //       setTimeout(() => {
  //         count++;
  //         this.setState({ first: 2 });
  //       }, 50);
  //     }

  //     componentWillReceiveProps({ apollo: { queries } }) {
  //       const queryNumber = Object.keys(queries).length;
  //       if (count === 0) expect(queryNumber).toEqual(1);
  //       if (count === 1) expect(queryNumber).toEqual(0);
  //       if (count === 2) {
  //         expect(queryNumber).toEqual(1);
  //         done();
  //       }
  //     }

  //     render() {
  //       if (this.state.first === 0) return null;
  //       return <Container first={this.state.first} />;
  //     }
  //   }

  //   renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  // });

  it('reruns the query if just the variables change', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: (props) => ({ variables: props }) })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 1 && data.loading) {
          expect(data.allPeople).toEqual(data1.allPeople);
        }
        if (count === 1 && !data.loading && this.props.data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  });

  it('reruns the queries on prop change when using passed props', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // loading is true, but data still there
        if (count === 1 && data.loading) {
          expect(data.allPeople).toEqual(data1.allPeople);
        }
        if (count === 1 && !data.loading && this.props.data.loading) {
          expect(data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(<ApolloProvider client={client}><ChangingProps /></ApolloProvider>);
  });

  it('stays subscribed to updates after irrelevant prop changes', (done) => {
    const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
    const variables = { first: 1 };
    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables }, result: { data: data2 } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    @graphql(query, { options() { return { variables, notifyOnNetworkStatusChange: false }; } })
    class Container extends React.Component<any, any> {8
      componentWillReceiveProps(props) {
        count += 1;

        if (count == 1) {
          expect(props.foo).toEqual(42);
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          props.changeState();
        } else if (count == 2) {
          expect(props.foo).toEqual(43);
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          props.data.refetch();
        } else if (count == 3) {
          expect(props.foo).toEqual(43);
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    class Parent extends React.Component<any, any> {
      constructor() {
        super();
        this.state = { foo: 42 };
      }
      render() {
        return <Container foo={this.state.foo} changeState={() => this.setState({ foo: 43 })}/>;
      }
    };

    renderer.create(<ApolloProvider client={client}><Parent /></ApolloProvider>);
  });

  it('exposes refetch as part of the props api', (done) => {
    const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
    const variables = { first: 1 };
    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables }, result: { data: data1 } },
      { request: { query, variables: { first: 2 } }, result: { data: data1 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let hasRefetched, count = 0;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount(){
        expect(this.props.data.refetch).toBeTruthy();
        expect(this.props.data.refetch instanceof Function).toBe(true);
      }
      componentWillReceiveProps({ data }) { // tslint:disable-line
        if (count === 0) expect(data.loading).toBe(false); // first data
        if (count === 1) expect(data.loading).toBe(true); // first refetch
        if (count === 2) expect(data.loading).toBe(false); // second data
        if (count === 3) expect(data.loading).toBe(true); // second refetch
        if (count === 4) expect(data.loading).toBe(false); // third data
        count ++;
        if (hasRefetched) return;
        hasRefetched = true;
        expect(data.refetch).toBeTruthy();
        expect(data.refetch instanceof Function).toBe(true);
        data.refetch()
          .then(result => {
            expect(result.data).toEqual(data1);
            data.refetch({ first: 2 }) // new variables
              .then(response => {
                expect(response.data).toEqual(data1);
                expect(data.allPeople).toEqual(data1.allPeople);
                done();
              });
          })
          .catch(done);
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container first={1} /></ApolloProvider>);
  });

  // Failing because fetchMore is not bound w/ createBoundRefetch either,
  //   so no loading state
  it('exposes fetchMore as part of the props api', (done) => {
    const query = gql`
      query people($skip: Int, $first: Int) { allPeople(first: $first, skip: $skip) { people { name } } }
    `;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data1 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables = { skip: 1, first: 1 };
    const variables2 = { skip: 2, first: 1 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data1 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    @graphql(query, { options: () => ({ variables }) })
    class Container extends React.Component<any, any> {
      componentWillMount(){
        expect(this.props.data.fetchMore).toBeTruthy();
        expect(this.props.data.fetchMore instanceof Function).toBe(true);
      }
      componentWillReceiveProps = wrap(done, (props) => {
        if (count === 0) {
          expect(props.data.fetchMore).toBeTruthy();
          expect(props.data.fetchMore instanceof Function).toBe(true);
          props.data.fetchMore({
            variables: { skip: 2 },
            updateQuery: (prev, { fetchMoreResult }) => ({
              allPeople: {
                people: prev.allPeople.people.concat(fetchMoreResult.allPeople.people),
              },
            }),
          }).then(wrap(done, result => {
            expect(result.data.allPeople.people).toEqual(data1.allPeople.people);
          }));
        } else if (count === 1) {
          expect(props.data.variables).toEqual(variables);
          expect(props.data.loading).toBe(false);
          expect(props.data.allPeople.people).toEqual(
            data.allPeople.people.concat(data1.allPeople.people)
          );
          done();
        } else {
          throw new Error('should not reach this point');
        }
        count++;
      })
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('exposes stopPolling as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) { // tslint:disable-line
        expect(data.stopPolling).toBeTruthy();
        expect(data.stopPolling instanceof Function).toBe(true);
        expect(data.stopPolling).not.toThrow();
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('exposes subscribeToMore as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) { // tslint:disable-line
        expect(data.subscribeToMore).toBeTruthy();
        expect(data.subscribeToMore instanceof Function).toBe(true);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('exposes startPolling as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let wrapper;

    // @graphql(query)
    @graphql(query, { options: { pollInterval: 10 }})
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) { // tslint:disable-line
        expect(data.startPolling).toBeTruthy();
        expect(data.startPolling instanceof Function).toBe(true);
        // XXX this does throw because of no pollInterval
        // expect(data.startPolling).not.toThrow();
        setTimeout(() => {
          wrapper.unmount();
          done();
        }, 0);
      }
      render() {
        return null;
      }
    };

    wrapper = renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('exposes networkStatus as a part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true }})
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        expect(data.networkStatus).toBeTruthy();
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });

  it('should set the initial networkStatus to 1 (loading)', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true }})
    class Container extends React.Component<any, any> {
      constructor({ data: { networkStatus } }) {
        super();
        expect(networkStatus).toBe(1);
        done();
      }

      render() {
        return null;
      }
    }

    renderer.create(
        <ApolloProvider client={client}>
          <Container />
        </ApolloProvider>
    );
  });

  it('should set the networkStatus to 7 (ready) when the query is loaded', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true }})
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data: { networkStatus } }) {
        expect(networkStatus).toBe(7);
        done();
      }

      render() {
        return null;
      }
    }

    renderer.create(
        <ApolloProvider client={client}>
          <Container />
        </ApolloProvider>
    );
  });

  it('should set the networkStatus to 2 (setVariables) when the query variables are changed', (done) => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) { people { name } }
      }
    `;

    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: (props) => ({ variables: props, notifyOnNetworkStatusChange: true }) })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(nextProps) {
        // variables changed, new query is loading, but old data is still there
        if (count === 1 && nextProps.data.loading) {
          expect(nextProps.data.networkStatus).toBe(2);
          expect(nextProps.data.allPeople).toEqual(data1.allPeople);
        }
        // query with new variables is loaded
        if (count === 1 && !nextProps.data.loading && this.props.data.loading) {
          expect(nextProps.data.networkStatus).toBe(7);
          expect(nextProps.data.allPeople).toEqual(data2.allPeople);
          done();
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
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(
        <ApolloProvider client={client}>
          <ChangingProps />
        </ApolloProvider>
    );
  });

  it('resets the loading state after a refetched query', () => new Promise((resolve, reject) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps = wrap(reject, (props) => {
        switch (count++) {
          case 0:
            expect(props.data.networkStatus).toBe(7);
            props.data.refetch();
            break;
          case 1:
            expect(props.data.loading).toBe(true);
            expect(props.data.networkStatus).toBe(4);
            expect(props.data.allPeople).toEqual(data.allPeople);
            break;
          case 2:
            expect(props.data.loading).toBe(false);
            expect(props.data.networkStatus).toBe(7);
            expect(props.data.allPeople).toEqual(data2.allPeople);
            resolve();
            break;
          default:
            reject(new Error('Too many props updates'));
        }
      });

      render() {
        return null;
      }
    };

    const wrapper = renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  }));

  // XXX: this does not occur at the moment. When we add networkStatus, we should
  // see a few more states
  // it('resets the loading state after a refetched query even if the data doesn\'t change', (d) => {
  //   const query = gql`query people { allPeople(first: 1) { people { name } } }`;
  //   const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
  //   const networkInterface = mockNetworkInterface(
  //     { request: { query }, result: { data } },
  //     { request: { query }, result: { data } }
  //   );
  //   const client = new ApolloClient({ networkInterface, addTypename: false });
  //
  //   let isRefectching;
  //   let refetched;
  //   @graphql(query)
  //   class Container extends React.Component<any, any> {
  //     componentWillReceiveProps(props) {
  //       // get new data with no more loading state
  //       if (refetched) {
  //         expect(props.data.loading).toBe(false);
  //         expect(props.data.allPeople).toEqual(data.allPeople);
  //         d();
  //         return;
  //       }
  //
  //       // don't remove old data
  //       if (isRefectching) {
  //         isRefectching = false;
  //         refetched = true;
  //         expect(props.data.loading).toBe(true);
  //         expect(props.data.allPeople).toEqual(data.allPeople);
  //         return;
  //       }
  //
  //       if (!isRefectching) {
  //         isRefectching = true;
  //         props.data.refetch();
  //       }
  //     }
  //     render() {
  //       return null;
  //     }
  //   };
  //
  //   renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  // });

  it('allows a polling query to be created', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    const Container = graphql(query, { options: () => ({ pollInterval: 75, notifyOnNetworkStatusChange: false }) })(() => {
      count++;
      return null;
    });

    const wrapper = renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);

    setTimeout(() => {
      expect(count).toBe(3);
      (wrapper as any).unmount();
      done();
    }, 160);
  });

  it('allows custom mapping of a result to props', () => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const props = ({ data }) => ({ showSpinner: data.loading });
    const ContainerWithData = graphql(query, { props })(({ showSpinner }) => {
      expect(showSpinner).toBe(true);
      return null;
    });

    const wrapper = renderer.create(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props that includes the passed props', () => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const props = ({ data, ownProps }) => {
      expect(ownProps.sample).toBe(1);
      return { showSpinner: data.loading };
    };
    const ContainerWithData = graphql(query, { props })(({ showSpinner }) => {
      expect(showSpinner).toBe(true);
      return null;
    });

    const wrapper = renderer.create(
      <ApolloProvider client={client}><ContainerWithData sample={1} /></ApolloProvider>
    );
    (wrapper as any).unmount();
  });

  it('allows custom mapping of a result to props', (done) => {
    const query = gql`query thing { getThing { thing } }`;
    const data = { getThing: { thing: true } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { props: ({ data }) => ({ thingy: data.getThing }) }) // tslint:disable-line
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.thingy).toEqual(data.getThing);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('allows context through updates', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.allPeople).toEqual(data.allPeople);
      }
      render() {
        return <div>{this.props.children}</div>;
      }
    };

    class ContextContainer extends React.Component<any, any> {

      constructor(props) {
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
        const { color } = (this.context as any);
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
      </ApolloProvider>);
  });

  it('exposes updateQuery as part of the props api', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) { // tslint:disable-line
        expect(data.updateQuery).toBeTruthy();
        expect(data.updateQuery instanceof Function).toBe(true);
        try {
          data.updateQuery(() => done());
        } catch (error) {
          // fail
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('exposes updateQuery as part of the props api during componentWillMount', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount() { // tslint:disable-line
        expect(this.props.data.updateQuery).toBeTruthy()
        expect(this.props.data.updateQuery instanceof Function).toBe(true);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('updateQuery throws if called before data has returned', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount() { // tslint:disable-line
        expect(this.props.data.updateQuery).toBeTruthy();
        expect(this.props.data.updateQuery instanceof Function).toBe(true);
        try {
          this.props.data.updateQuery();
          done();
        } catch (e) {
          expect(e.toString()).toMatch(/ObservableQuery with this id doesn't exist:/);
          done();
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('allows updating query results after query has finished (early binding)', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let isUpdated;
    @graphql(query)
    class Container extends React.Component<any, any> {
      public updateQuery: any;
      componentWillMount() {
        this.updateQuery = this.props.data.updateQuery;
      }
      componentWillReceiveProps(props) {
        if (isUpdated) {
          expect(props.data.allPeople).toEqual(data2.allPeople);
          done();
          return;
        } else {
          isUpdated = true;
          this.updateQuery((prev) => {
            return data2;
          });
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('allows updating query results after query has finished', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let isUpdated;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (isUpdated) {
          expect(props.data.allPeople).toEqual(data2.allPeople);
          done();
          return;
        } else {
          isUpdated = true;
          props.data.updateQuery((prev) => {
            return data2;
          });
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('reruns props function after query results change via fetchMore', (done) => {
    const query = gql`query people($cursor: Int) {
      allPeople(cursor: $cursor) { cursor, people { name } }
    }`;
    const vars1 = { cursor: null };
    const data1 = { allPeople: { cursor: 1, people: [ { name: 'Luke Skywalker' } ] } };
    const vars2 = { cursor: 1 };
    const data2 = { allPeople: { cursor: 2, people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables: vars1 }, result: { data: data1 } },
      { request: { query, variables: vars2 }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let isUpdated = false;
    @graphql(query, {
      // XXX: I think we should be able to avoid this https://github.com/apollostack/react-apollo/issues/197
      options: { variables: { cursor: null } },
      props({ data: { loading, allPeople, fetchMore } }) {
        if (loading) return { loading };

        const { cursor, people } = allPeople;
        return {
          people,
          getMorePeople: () => fetchMore({
            variables: { cursor },
            updateQuery(prev, { fetchMoreResult }) {
              const { allPeople: { cursor, people } } = fetchMoreResult;
              return {
                allPeople: {
                  cursor,
                  people: [...people, ...prev.allPeople.people],
                },
              };
            }
          }),
        }
      }
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (props.loading) {
          return;
        } else if (isUpdated) {
          expect(props.people.length).toBe(2);
          done();
          return;
        } else {
          isUpdated = true;
          expect(props.people).toEqual(data1.allPeople.people);
          props.getMorePeople();
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('correctly rebuilds props on remount', (done) => {
    const query = gql`query pollingPeople { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Darth Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data }, newData: () => ({
        data: {
          allPeople: { people: [ { name: `Darth Skywalker - ${Math.random()}` } ] },
        },
      }) }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let wrapper, app, count = 0;

    @graphql(query, { options: { pollInterval: 10, notifyOnNetworkStatusChange: false }})
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (count === 1) { // has data
          wrapper.unmount();
          wrapper = mount(app);
        }

        if (count === 10) {
          wrapper.unmount();
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    };

    app = <ApolloProvider client={client}><Container /></ApolloProvider>;

    wrapper = mount(app);
  });

  it('correctly sets loading state on remounted network-only query', (done) => {
    const query = gql`query pollingPeople { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Darth Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data }, delay: 10, newData: () => ({
        data: {
          allPeople: { people: [ { name: `Darth Skywalker - ${Math.random()}` } ] },
        },
      }) }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let wrapper, app, count = 0;

    @graphql(query, { options: { fetchPolicy: 'network-only' }})
    class Container extends React.Component<any, any> {
      componentWillMount() {
        if (count === 1) {
          expect(this.props.data.loading).toBe(true); // on remount
          count++;
        }
      }
      componentWillReceiveProps(props) {
        if (count === 0) { // has data
          wrapper.unmount();
          setTimeout(() => {
            wrapper = mount(app);
          }, 5);
        }

        if (count === 2) {
          // remounted data after fetch
          expect(props.data.loading).toBe(false);
          expect(props.data.allPeople).toBeTruthy();
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    };

    app = <ApolloProvider client={client}><Container /></ApolloProvider>;

    wrapper = mount(app);
  });

  it('correctly sets loading state on remounted component with changed variables', (done) => {
    const query = gql`
      query remount($first: Int) { allPeople(first: $first) { people { name } } }
    `;
    const data = { allPeople: null };
    const variables = { first: 1 };
    const variables2 = { first: 2 };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data }, delay: 10 },
      { request: { query, variables: variables2 }, result: { data }, delay: 10 }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let wrapper, render, count = 0;

    @graphql(query, { options: ({ first }) => ({ variables: { first }})})
    class Container extends React.Component<any, any> {
      componentWillMount() {
        if (count === 1) {
          expect(this.props.data.loading).toBe.true; // on remount
          count++;
        }
      }
      componentWillReceiveProps(props) {
        if (count === 0) { // has data
          wrapper.unmount();
          setTimeout(() => {
            wrapper = mount(render(2));
          }, 5);
        }

        if (count === 2) {
          // remounted data after fetch
          expect(props.data.loading).toBe.false;
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    };

    render = (first) => (
      <ApolloProvider client={client}><Container first={first} /></ApolloProvider>
    );

    wrapper = mount(render(1));
  });

  it('correctly sets loading state on remounted component with changed variables (alt)', (done) => {
    const query = gql`
      query remount($name: String) { allPeople(name: $name) { people { name } } }
    `;
    const data = { allPeople: null };
    const variables = { name: 'does-not-exist' };
    const variables2 = { name: 'nothing-either' };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data }, delay: 10 },
      { request: { query, variables: variables2 }, result: { data }, delay: 10 }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let count = 0;

    @graphql(query)
    class Container extends React.Component<any, any> {
      render() {
        const { loading } = this.props.data;
        if (count === 0) expect(loading).toBe.true;
        if (count === 1) expect(loading).toBe.false;
        if (count === 2) expect(loading).toBe.true;
        if (count === 3) {
          expect(loading).toBe.false;
          done();
        }
        count ++;
        return null;
      }
    };
    const main = document.createElement('DIV');
    main.id = 'main';
    document.body.appendChild(main);

    const render = (props) => {
      ReactDOM.render((
        <ApolloProvider client={client}>
          <Container {...props} />
        </ApolloProvider>
      ), document.getElementById('main'));
    };

    // Initial render.
    render(variables);

    // Prop update: fetch.
    setTimeout(() => render(variables2), 1000);
  });

  it('correctly sets loading state on component with changed variables and unchanged result', (done) => {
     const query = gql`
       query remount($first: Int) { allPeople(first: $first) { people { name } } }
     `;
     const data = { allPeople: null };
     const variables = { first: 1 };
     const variables2 = { first: 2 };
     const networkInterface = mockNetworkInterface(
       { request: { query, variables }, result: { data }, delay: 10 },
       { request: { query, variables: variables2 }, result: { data }, delay: 10 }
     );
     const client = new ApolloClient({ networkInterface, addTypename: false });
     let count = 0;

     const connect = (component) : any => {
       return class Container extends React.Component<any, any> {
         constructor(props) {
           super(props);

           this.state = {
             first: 1,
           };
           this.setFirst = this.setFirst.bind(this);
         }

         setFirst(first) {
           this.setState({first});
         }

         render() {
           return React.createElement(component, {
             first: this.state.first,
             setFirst: this.setFirst
           });
         }
       }
     }

     @connect
     @graphql(query, { options: ({ first }) => ({ variables: { first }})})
     class Container extends React.Component<any, any> {
       componentWillReceiveProps(props) {
         if (count === 0) {
           expect(props.data.loading).toBe.false; // has initial data
           setTimeout(() => {
             this.props.setFirst(2);
           }, 5);
         }

         if (count === 1) {
           expect(props.data.loading).toBe.true; // on variables change
         }

         if (count === 2) {
           // new data after fetch
           expect(props.data.loading).toBe.false;
           done();
         }
         count++;
       }
       render() {
         return null;
       }
     };
     const output = renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('stores the component name in the query metadata', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        const queries = client.queryManager.getApolloState().queries;
        const queryIds = Object.keys(queries);
        expect(queryIds.length).toEqual(1);
        const query = queries[queryIds[0]];
        expect(query.metadata).toEqual({
          reactComponent: {
            displayName: 'Apollo(Container)',
          },
        });
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });

  it('uses a custom wrapped component name when \'alias\' is specified', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    @graphql(query, {
      alias: 'withFoo',
    })
    class Container extends React.Component<any, any> {
      render() {
        return null;
      }
    }

    // Not sure why I have to cast Container to any
    expect((Container as any).displayName).toEqual('withFoo(Container)');
  });

  it('will recycle `ObservableQuery`s when re-rendering the entire tree', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      render () {
        return null;
      }
    }

    const wrapper1 = renderer.create(
      <ApolloProvider client={client}>
        <Container/>
      </ApolloProvider>
    );

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
    const queryObservable1: ObservableQuery<any> = (client as any).queryManager.observableQueries['1'].observableQuery;

    const originalOptions = Object.assign({}, queryObservable1.options);

    wrapper1.unmount();

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);

    const wrapper2 = renderer.create(
      <ApolloProvider client={client}>
        <Container/>
      </ApolloProvider>
    );

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
    const queryObservable2: ObservableQuery<any> = (client as any).queryManager.observableQueries['1'].observableQuery;

    const recycledOptions = queryObservable2.options;

    expect(queryObservable1).toBe(queryObservable2);
    expect(recycledOptions).toEqual(originalOptions);

    wrapper2.unmount();

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
  });

  it('will not try to refetch recycled `ObservableQuery`s when resetting the client store', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = {
      query: jest.fn(),
    } as NetworkInterface;
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      render () {
        return null;
      }
    }

    const wrapper1 = renderer.create(
      <ApolloProvider client={client}>
        <Container/>
      </ApolloProvider>
    );

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
    const queryObservable1 = (client as any).queryManager.observableQueries['1'].observableQuery;

    // The query should only have been invoked when first mounting and not when resetting store
    expect(networkInterface.query).toHaveBeenCalledTimes(1);

    wrapper1.unmount();

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
    const queryObservable2 = (client as any).queryManager.observableQueries['1'].observableQuery;

    expect(queryObservable1).toBe(queryObservable2);

    client.resetStore();

    // The query should not have been fetch again
    expect(networkInterface.query).toHaveBeenCalledTimes(1);
  });

  it('will refetch active `ObservableQuery`s when resetting the client store', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = {
      query: jest.fn(),
    } as NetworkInterface;
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query)
    class Container extends React.Component<any, any> {
      render () {
        return null;
      }
    }

    const wrapper1 = renderer.create(
      <ApolloProvider client={client}>
        <Container/>
      </ApolloProvider>
    );

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);

    expect(networkInterface.query).toHaveBeenCalledTimes(1);

    client.resetStore();

    expect(networkInterface.query).toHaveBeenCalledTimes(2);
  });

  it('will recycle `ObservableQuery`s when re-rendering a portion of the tree', done => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let remount: any;

    class Remounter extends React.Component<any, any> {
      state = {
        showChildren: true,
      };

      componentDidMount () {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({ showChildren: true });
            }, 5);
          });
        }
      }

      render () {
        return this.state.showChildren ? this.props.children : null;
      }
    }

    @graphql(query)
    class Container extends React.Component<any, any> {
      render () {
        return null;
      }
    }

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Remounter>
          <Container/>
        </Remounter>
      </ApolloProvider>
    );

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
    const queryObservable1 = (client as any).queryManager.observableQueries['1'].observableQuery;

    remount();

    setTimeout(() => {
      expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
      const queryObservable2 = (client as any).queryManager.observableQueries['1'].observableQuery;
      expect(queryObservable1).toBe(queryObservable2);

      remount();

      setTimeout(() => {
        expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1']);
        const queryObservable3 = (client as any).queryManager.observableQueries['1'].observableQuery;
        expect(queryObservable1).toBe(queryObservable3);

        wrapper.unmount();
        done();
      }, 10);
    }, 10);
  });

  it('will not recycle parallel GraphQL container `ObservableQuery`s', done => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let remount: any;

    class Remounter extends React.Component<any, any> {
      state = {
        showChildren: true,
      };

      componentDidMount () {
        remount = () => {
          this.setState({ showChildren: false }, () => {
            setTimeout(() => {
              this.setState({ showChildren: true });
            }, 5);
          });
        }
      }

      render () {
        return this.state.showChildren ? this.props.children : null;
      }
    }

    @graphql(query)
    class Container extends React.Component<any, any> {
      render () {
        return null;
      }
    }

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <div>
          <Container/>
          <Remounter>
            <Container/>
          </Remounter>
        </div>
      </ApolloProvider>
    );

    expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1', '2']);
    const queryObservable1 = (client as any).queryManager.observableQueries['1'].observableQuery;
    const queryObservable2 = (client as any).queryManager.observableQueries['2'].observableQuery;
    expect(queryObservable1).not.toBe(queryObservable2);

    remount();

    setTimeout(() => {
      expect(Object.keys((client as any).queryManager.observableQueries)).toEqual(['1', '2']);
      const queryObservable3 = (client as any).queryManager.observableQueries['1'].observableQuery;
      const queryObservable4 = (client as any).queryManager.observableQueries['2'].observableQuery;

      // What we really want to test here is if the `queryObservable` on
      // `Container`s are referentially equal. But because there is no way to
      // get the component instances we compare against the query manager
      // observable queries map isntead which shouldn’t change.
      expect(queryObservable3).not.toBeFalsy();
      expect(queryObservable4).not.toBeFalsy();
      expect(queryObservable3).toBe(queryObservable1);
      expect(queryObservable4).toBe(queryObservable2);

      wrapper.unmount();
      done();
    }, 10);
  });

  it('will not log a warning when there is an error that is caught in the render method', () => new Promise((resolve, reject) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const networkInterface = mockNetworkInterface({ request: { query }, error: new Error('oops') });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const origError = console.error;
    const errorMock = jest.fn();
    console.error = errorMock;

    let renderCount = 0;
    @graphql(query)
    class HandledErrorComponent extends React.Component<any, any> {
      render() {
        try {
          switch (renderCount++) {
            case 0:
              expect(this.props.data.loading).toEqual(true);
              break;
            case 1:
              expect(this.props.data.error.message).toEqual('Network error: oops');
              break;
            default:
              throw new Error('Too many renders.');
          }
        } catch (error) {
          console.error = origError;
          reject(error);
        }
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <HandledErrorComponent/>
      </ApolloProvider>
    );

    setTimeout(() => {
      try {
        expect(renderCount).toBe(2);
        expect(errorMock.mock.calls.length).toBe(0);
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        console.error = origError;
      }
    }, 20);
  }));

  it('will log a warning when there is an error that is not caught in the render method', () => new Promise((resolve, reject) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const networkInterface = mockNetworkInterface({ request: { query }, error: new Error('oops') });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const origError = console.error;
    const errorMock = jest.fn();
    console.error = errorMock;

    let renderCount = 0;
    @graphql(query)
    class UnhandledErrorComponent extends React.Component<any, any> {
      render() {
        try {
          switch (renderCount++) {
            case 0:
              expect(this.props.data.loading).toEqual(true);
              break;
            case 1:
              // Noop. Don’t handle the error so a warning will be logged to the console.
              break;
            default:
              throw new Error('Too many renders.');
          }
        } catch (error) {
          console.error = origError;
          reject(error);
        }
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <UnhandledErrorComponent/>
      </ApolloProvider>
    );

    setTimeout(() => {
      try {
        expect(renderCount).toBe(2);
        expect(errorMock.mock.calls.length).toBe(1);
        expect(errorMock.mock.calls[0][0]).toEqual('Unhandled (in react-apollo)');
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        console.error = origError;
      }
    }, 20);
  }));

  it('will re-execute a query when the client changes', async () => {
    const query = gql`{ a b c }`;
    const networkInterface1 = { query: jest.fn(() => Promise.resolve({ data: { a: 1, b: 2, c: 3 } })) };
    const networkInterface2 = { query: jest.fn(() => Promise.resolve({ data: { a: 4, b: 5, c: 6 } })) };
    const networkInterface3 = { query: jest.fn(() => Promise.resolve({ data: { a: 7, b: 8, c: 9 } })) };
    const client1 = new ApolloClient({ networkInterface: networkInterface1 });
    const client2 = new ApolloClient({ networkInterface: networkInterface2 });
    const client3 = new ApolloClient({ networkInterface: networkInterface3 });
    const renders = [];
    let switchClient;
    let refetchQuery;

    class ClientSwitcher extends React.Component<any, any> {
      state = {
        client: client1,
      };

      componentDidMount() {
        switchClient = newClient => {
          this.setState({ client: newClient });
        };
      }

      render() {
        return (
          <ApolloProvider client={this.state.client}>
            <Query/>
          </ApolloProvider>
        );
      }
    }

    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Query extends React.Component<any, any> {
      componentDidMount() {
        refetchQuery = () => this.props.data.refetch();
      }

      render() {
        const { data: { loading, a, b, c } } = this.props;
        renders.push({ loading, a, b, c });
        return null;
      }
    }

    renderer.create(<ClientSwitcher/>);

    await wait(1);
    refetchQuery();
    await wait(1);
    switchClient(client2);
    await wait(1);
    refetchQuery();
    await wait(1);
    switchClient(client3);
    await wait(1);
    switchClient(client1);
    await wait(1);
    switchClient(client2);
    await wait(1);
    switchClient(client3);
    await wait(1);

    expect(renders).toEqual([
      { loading: true },
      { loading: false, a: 1, b: 2, c: 3 },
      { loading: true, a: 1, b: 2, c: 3 },
      { loading: false, a: 1, b: 2, c: 3 },
      { loading: true },
      { loading: false, a: 4, b: 5, c: 6 },
      { loading: true, a: 4, b: 5, c: 6 },
      { loading: false, a: 4, b: 5, c: 6 },
      { loading: true },
      { loading: false, a: 7, b: 8, c: 9 },
      { loading: false, a: 1, b: 2, c: 3 },
      { loading: false, a: 4, b: 5, c: 6 },
      { loading: false, a: 7, b: 8, c: 9 },
    ]);
  });

});
