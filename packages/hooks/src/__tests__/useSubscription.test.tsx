import React from 'react';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider } from '@apollo/react-common';
import { MockSubscriptionLink } from '@apollo/react-testing';
import { render, cleanup } from 'react-testing-library';
import gql from 'graphql-tag';

import { useSubscription } from '../useSubscription';

describe('useSubscription Hook', () => {
  afterEach(cleanup);

  it('should handle a simple subscription properly', done => {
    jest.useFakeTimers();

    const subscription = gql`
      subscription {
        car {
          make
        }
      }
    `;

    const results = ['Audi', 'BMW', 'Mercedes', 'Hyundai'].map(make => ({
      result: { data: { car: { make } } }
    }));

    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let renderCount = 0;
    const Component = () => {
      const { loading, data, error } = useSubscription(subscription);
      switch (renderCount) {
        case 0:
          expect(loading).toBe(true);
          expect(error).toBeUndefined();
          expect(data).toBeUndefined();
          break;
        case 1:
          expect(loading).toBe(false);
          expect(data).toEqual(results[0].result.data);
          break;
        case 2:
          expect(loading).toBe(false);
          expect(data).toEqual(results[1].result.data);
          break;
        case 3:
          expect(loading).toBe(false);
          expect(data).toEqual(results[2].result.data);
          break;
        case 4:
          expect(loading).toBe(false);
          expect(data).toEqual(results[3].result.data);
          done();
          break;
        default:
      }
      renderCount += 1;
      return null;
    };

    render(
      <ApolloProvider client={client}>
        <Component />
      </ApolloProvider>
    );

    const interval = setInterval(() => {
      link.simulateResult(results[renderCount - 1]);
      if (renderCount > 3) clearInterval(interval);
    }, 10);

    jest.runTimersToTime(40);
  });
});
