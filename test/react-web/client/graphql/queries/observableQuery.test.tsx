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

describe('[queries] observableQuery', () => {

  // observableQuery
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

  it('will not try to refetch recycled `ObservableQuery`s when resetting the client store', (done) => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    let finish = () => {};
    const networkInterface = {
      query: jest.fn(() => {
        setTimeout(finish, 5);
        return Promise.resolve({ data: {} })
      }),
    } as NetworkInterface;
    const client = new ApolloClient({ networkInterface, addTypename: false });

    // make sure that the in flight query is done before resetting store
    finish = () => {
      client.resetStore();

      // The query should not have been fetch again
      expect(networkInterface.query).toHaveBeenCalledTimes(1);

      done();
    }

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

  });

  it('will refetch active `ObservableQuery`s when resetting the client store', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = {
      query: jest.fn(() => Promise.resolve({ data: {}})),
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

});
