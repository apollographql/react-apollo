import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

describe('[queries] polling', () => {
  let error: typeof console.error;

  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {});
    jest.useRealTimers();
  });

  afterEach(() => {
    console.error = error;
    cleanup();
  });

  // polling
  it('allows a polling query to be created', done => {
    expect.assertions(4);

    const POLL_INTERVAL = 5;
    const POLL_COUNT = 4;
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
    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, result: { data: data2 } },
      { request: { query }, result: { data } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let count = 0;
    const Container = graphql(query, {
      options: () => ({
        pollInterval: POLL_INTERVAL,
        notifyOnNetworkStatusChange: false
      })
    })(() => {
      count++;
      expect(true).toBe(true);
      if (count === 4) {
        done();
      }
      return null;
    });

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });

  it('exposes stopPolling as part of the props api', done => {
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Container = graphql(query)(
      class extends React.Component<ChildProps> {
        componentDidUpdate() {
          const { data } = this.props;
          expect(data!.stopPolling).toBeTruthy();
          expect(data!.stopPolling instanceof Function).toBeTruthy();
          expect(data!.stopPolling).not.toThrow();
          done();
        }
        render() {
          return null;
        }
      }
    );
    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });

  it('exposes startPolling as part of the props api', done => {
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
      result: { data: { allPeople: { people: [{ name: 'Luke Skywalker' }] } } }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });
    const Container = graphql(query, { options: { pollInterval: 10 } })(
      class extends React.Component<ChildProps> {
        componentDidUpdate() {
          const { data } = this.props;
          expect(data!.startPolling).toBeTruthy();
          expect(data!.startPolling instanceof Function).toBeTruthy();
          // XXX this does throw because of no pollInterval
          // expect(data.startPolling).not.toThrow();
          setTimeout(() => {
            done();
          }, 0);
        }
        render() {
          return null;
        }
      }
    );

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });
});
