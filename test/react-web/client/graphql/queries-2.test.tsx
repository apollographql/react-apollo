/*
  XXX

  When these tests are included with the other queries tests,
  an error is thrown concerning calling `injectEnvironment` more than once.
  This is due to `react-test-renderer` and `mount` being used in
  the same file. We can move this back in once React 15.4 is released,
  which should have a fix for it.

  https://github.com/facebook/react/issues/7386
*/

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('queries', () => {
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

  it('recover after failed query', (done) => {
    const query = gql`query people { allPeople { people { name } } }`;
    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { data: data1 } },
      { request: { query }, result: { errors: [new Error("Permission Denied")] } },
      { request: { query }, result: { data: data1 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        count += 1;
        if (count == 1) {
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          done();
        } else if (count == 2) {
          expect(props.data.loading).toEqual(false);
          expect(props.data.error).toBeTruthy();
          expect(props.data.allPeople).toEqual(data1.allPeople);
          props.data.refetch();
        } else if (count == 3) {
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });

  it('recover after first query failed', (done) => {
    const query = gql`query people { allPeople { people { name } } }`;
    const data1 = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface(
      { request: { query }, result: { errors: [new Error("Permission Denied")] } },
      { request: { query }, result: { data: data1 } }
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let count = 0;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        count += 1;
        if (count == 1) {
          const notDefined;
          expect(props.data.loading).toEqual(false);
          expect(props.data.error).toBeTruthy();
          expect(props.data.allPeople).toEqual(notDefined);
          props.data.refetch();
        } else if (count == 2) {
          expect(props.data.loading).toEqual(false);
          expect(props.data.allPeople).toEqual(data1.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    renderer.create(<ApolloProvider client={client}><Container /></ApolloProvider>);
  });
});
