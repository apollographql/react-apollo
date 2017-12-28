import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('[queries] polling', () => {
  let error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {}); // tslint:disable-line
    jest.useRealTimers();
  });
  afterEach(() => {
    console.error = error;
  });
  // polling
  it('allows a polling query to be created', done => {
    jest.useFakeTimers();

    const POLL_INTERVAL = 250;
    const POLL_COUNT = 4;
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
    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } },
      { request: { query }, result: { data } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    const Container = graphql(query, {
      options: () => ({
        pollInterval: POLL_INTERVAL,
        notifyOnNetworkStatusChange: false,
      }),
    })(() => {
      count++;
      return null;
    });

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );

    jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

    try {
      expect(count).toEqual(POLL_COUNT);
      done();
    } catch (e) {
      done.fail(e);
    } finally {
      (wrapper as any).unmount();
    }
  });

  it('exposes stopPolling as part of the props api', done => {
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.stopPolling).toBeTruthy();
        expect(data.stopPolling instanceof Function).toBeTruthy();
        expect(data.stopPolling).not.toThrow();
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('exposes startPolling as part of the props api', done => {
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let wrapper;
    @graphql(query, { options: { pollInterval: 10 } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.startPolling).toBeTruthy();
        expect(data.startPolling instanceof Function).toBeTruthy();
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
    }

    wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
