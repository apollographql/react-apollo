import * as React from 'react';
import gql from 'graphql-tag';
import { mount } from 'enzyme';

import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { MockSubscriptionLink } from '../../src/test-utils';
import { ApolloProvider, ChildProps, graphql } from '../../src';
import stripSymbols from '../test-utils/stripSymbols';
import catchAsyncError from '../test-utils/catchAsyncError';
import Subscription from '../../src/Subscriptions';
import stripSymbols from '../test-utils/stripSymbols';

const results = [
  'James Baxley',
  'John Pinkerton',
  'Sam Claridge',
  'Ben Coleman',
].map(name => ({
  result: { data: { user: { name } } },
}));

let wrapper;

beforeEach(() => {
  jest.useRealTimers();
});

afterEach(() => {
  if (wrapper) {
    wrapper.unmount();
    wrapper = null;
  }
});

const subscription = gql`
  subscription UserInfo {
    user {
      name
    }
  }
`;

const link = new MockSubscriptionLink();
const client = new ApolloClient({
  link,
  cache: new Cache({ addTypename: false }),
});

it('executes the subscription', done => {
  jest.useFakeTimers();

  let count = 0;

  const Component = () => (
    <Subscription subscription={subscription}>
      {result => {
        const { loading, data } = result;

        catchAsyncError(done, () => {
          if (count === 0) {
            expect(loading).toBeTruthy();
            expect(data).toEqual({});
          }
          if (count === 1)
            expect(stripSymbols(data)).toEqual(results[0].result.data);
          if (count === 2)
            expect(stripSymbols(data)).toEqual(results[1].result.data);
          if (count === 3)
            expect(stripSymbols(data)).toEqual(results[2].result.data);
          if (count === 4) {
            expect(stripSymbols(data)).toEqual(results[3].result.data);
            done();
          }
        });

        count++;
        return null;
      }}
    </Subscription>
  );

  wrapper = mount(
    <ApolloProvider client={client}>
      <Component />
    </ApolloProvider>,
  );

  const interval = setInterval(() => {
    link.simulateResult(results[count - 1]);
    if (count > 3) clearInterval(interval);
  }, 10);

  jest.runTimersToTime(40);
});

it('renders an error', done => {
  const subscriptionError = {
    result: {
      error: new Error('error occurred'),
    },
  };

  const Component = () => (
    <Subscription subscription={subscription}>
      {result => {
        const { loading, data, error } = result;
        if (loading) {
          return null;
        }
        catchAsyncError(done, () => {
          expect(error).toEqual();
          done();
        });

        return null;
      }}
    </Subscription>
  );

  wrapper = mount(
    <ApolloProvider client={client}>
      <Component />
    </ApolloProvider>,
  );

  link.simulateResult(subscriptionError);
});
