/// <reference types="jest" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';

import ApolloClient, { ApolloError } from 'apollo-client';
import { connect } from 'react-redux';

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
        expect(data.error instanceof ApolloError).toBe(true);
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><ErrorContainer /></ApolloProvider>);
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
      renderer.create(<ApolloProvider client={client}><Container frst={1} /></ApolloProvider>);
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
    @graphql(query, { options: ({ skip }) => ({ skip, forceFetch: true }) })
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
      options: (props) => ({ variables: props, returnPartialData: count === 0 }),
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
    @graphql(query, { options() { return { variables }; } })
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
                people: prev.allPeople.people.concat(fetchMoreResult.data.allPeople.people),
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

    // @graphql(query)
    @graphql(query, { options: { pollInterval: 10 }})
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) { // tslint:disable-line
        expect(data.startPolling).toBeTruthy();
        expect(data.startPolling instanceof Function).toBe(true);
        // XXX this does throw because of no pollInterval
        // expect(data.startPolling).not.toThrow();
        done();
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
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

  it('resets the loading state after a refetched query', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let refetched;
    let isRefetching;
    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps = wrap(done, (props) => {
        if (!isRefetching) {
          isRefetching = true;
          expect(props.data.networkStatus).toBe(7);
          props.data.refetch();
          return;
        }

        // get new data with no more loading state
        if (isRefetching) {
          expect(props.data.loading).toBe(false);
          expect(props.data.networkStatus).toBe(4);
          expect(props.data.allPeople).toEqual(data2.allPeople);
          refetched = true;
          return;
        }

        if (refetched) {
          expect(props.data.networkStatus).toBe(7);
          done();
        }
      })
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

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
    const Container = graphql(query, { options: () => ({ pollInterval: 75 }) })(() => {
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
      color: React.PropTypes.string,
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
      color: React.PropTypes.string,
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
              const { data: { allPeople: { cursor, people } } } = fetchMoreResult;
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

    @graphql(query, { options: { pollInterval: 10 }})
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

  it('correctly sets loading state on remounted forcefetch', (done) => {
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

    @graphql(query, { options: { forceFetch: true }})
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

     mount(<ApolloProvider client={client}><Container /></ApolloProvider>);
   });
});
