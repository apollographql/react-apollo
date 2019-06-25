import React from 'react';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider } from '@apollo/react-common';
import { MockSubscriptionLink } from '@apollo/react-testing';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import { useSubscription } from '@apollo/react-hooks';

describe('useSubscription Hook', () => {
  afterEach(cleanup);

  it('should handle a simple subscription properly', done => {
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
      setTimeout(() => {
        renderCount <= results.length &&
          link.simulateResult(results[renderCount - 1]);
      });
      renderCount += 1;
      return null;
    };

    render(
      <ApolloProvider client={client}>
        <Component />
      </ApolloProvider>
    );
  });

  it('should cleanup after the subscription component has been unmounted', done => {
    const subscription = gql`
      subscription {
        car {
          make
        }
      }
    `;

    const results = [
      {
        result: { data: { car: { make: 'Pagani' } } }
      }
    ];

    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let renderCount = 0;
    let onSubscriptionDataCount = 0;
    let unmount: any;

    const Component = () => {
      const { loading, data, error } = useSubscription(subscription, {
        onSubscriptionData() {
          onSubscriptionDataCount += 1;
        }
      });
      switch (renderCount) {
        case 0:
          expect(loading).toBe(true);
          expect(error).toBeUndefined();
          expect(data).toBeUndefined();
          link.simulateResult(results[0]);
          break;
        case 1:
          expect(loading).toBe(false);
          expect(data).toEqual(results[0].result.data);

          setTimeout(() => {
            expect(onSubscriptionDataCount).toEqual(1);

            // After the component has been unmounted, the internal
            // ObservableQuery should be stopped, meaning it shouldn't
            // receive any new data (so the onSubscriptionDataCount should
            // stay at 1).
            unmount();
            link.simulateResult(results[0]);
            setTimeout(() => {
              expect(onSubscriptionDataCount).toEqual(1);
              done();
            });
          });
          break;
        default:
      }
      renderCount += 1;
      return null;
    };

    unmount = render(
      <ApolloProvider client={client}>
        <Component />
      </ApolloProvider>
    ).unmount;
  });
});
