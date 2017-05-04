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
import { ApolloProvider, graphql} from '../../../../../src';

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

describe('[queries] updateQuery', () => {

  // updateQuery
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

});
