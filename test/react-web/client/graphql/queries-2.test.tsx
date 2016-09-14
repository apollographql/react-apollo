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
import { mount } from 'enzyme';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);

import mockNetworkInterface from '../../../mocks/mockNetworkInterface';
import { ProviderMock } from '../../../mocks/components';

import graphql from '../../../../src/graphql';

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
    const client = new ApolloClient({ networkInterface });
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

    app = <ProviderMock client={client}><Container /></ProviderMock>;

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
    const client = new ApolloClient({ networkInterface });
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

    app = <ProviderMock client={client}><Container /></ProviderMock>;

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
    const client = new ApolloClient({ networkInterface });
    let wrapper, render, count = 0;

    @graphql(query, { options: ({ first }) => ({ variables: { first }})})
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
            wrapper = mount(render(2));
          }, 5);
        }

        if (count === 2) {
          // remounted data after fetch
          expect(props.data.loading).toBe(false);
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    };

    render = (first) => (
      <ProviderMock client={client}><Container first={first} /></ProviderMock>
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
    const client = new ApolloClient({ networkInterface });
    let count = 0;

    @graphql(query)
    class Container extends React.Component<any, any> {
      render() {
        const { loading } = this.props.data;
        if (count === 0) expect(loading).toBe(true);
        if (count === 1) expect(loading).toBe(false);
        if (count === 2) expect(loading).toBe(true);
        if (count === 3) {
          expect(loading).toBe(false);
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
        <ProviderMock client={client}>
          <Container {...props} />
        </ProviderMock>
      ), document.getElementById('main'));
    };

    // Initial render.
    render(variables);

    // Prop update: fetch.
    setTimeout(() => render(variables2), 1000);
  });
});
