import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';

import { ApolloClient, ApolloError } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { MockSubscriptionLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('subscriptions', () => {
  let error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {});
  });
  afterEach(() => {
    console.error = error;
  });

  const results = [
    'James Baxley',
    'John Pinkerton',
    'Sam Clairidge',
    'Ben Coleman',
  ].map(name => ({ result: { data: { user: { name } } }, delay: 10 }));

  it('binds a subscription to props', () => {
    const query = gql`
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

    const ContainerWithData = graphql(query)(({ data }) => {
      // tslint:disable-line
      expect(data).toBeTruthy();
      expect(data.user).toBeFalsy();
      expect(data.loading).toBe(true);
      return null;
    });

    const output = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    output.unmount();
  });

  it('includes the variables in the props', () => {
    const query = gql`
      subscription UserInfo($name: String) {
        user(name: $name) {
          name
        }
      }
    `;
    const variables = { name: 'James Baxley' };
    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const ContainerWithData = graphql(query)(({ data }) => {
      // tslint:disable-line
      expect(data).toBeTruthy();
      expect(data.variables).toEqual(variables);
      return null;
    });

    const output = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData name={'James Baxley'} />
      </ApolloProvider>,
    );
    output.unmount();
  });

  it('does not swallow children errors', done => {
    const query = gql`
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

    let bar;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    class ErrorBoundary extends React.Component {
      componentDidCatch(e, info) {
        expect(e.name).toMatch(/TypeError/);
        expect(e.message).toMatch(/bar is not a function/);
        done();
      }

      render() {
        return this.props.children;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <ContainerWithData />
        </ErrorBoundary>
      </ApolloProvider>,
    );
  });

  it('executes a subscription', done => {
    const query = gql`
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

    let count = 0;
    let output;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount() {
        expect(this.props.data.loading).toBeTruthy();
      }
      componentWillReceiveProps({ data: { loading, user } }) {
        expect(loading).toBeFalsy();
        if (count === 0) expect(user).toEqual(results[0].result.user);
        if (count === 1) expect(user).toEqual(results[1].result.user);
        if (count === 2) expect(user).toEqual(results[2].result.user);
        if (count === 3) {
          expect(user).toEqual(results[3].result.user);
          output.unmount();
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    }

    const interval = setInterval(() => {
      link.simulateResult(results[count]);
      if (count > 3) clearInterval(interval);
    }, 50);

    output = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
  it('resubscribes to a subscription', done => {
    //we make an extra Hoc which will trigger the inner HoC to resubscribe
    //these are the results for the outer subscription
    const triggerResults = [
      '0',
      'trigger resubscribe',
      '3',
      '4',
      '5',
      '6',
      '7',
    ].map(trigger => ({ result: { data: { trigger } }, delay: 10 }));
    //These are the results fro the resubscription
    const results3 = [
      'NewUser: 1',
      'NewUser: 2',
      'NewUser: 3',
      'NewUser: 4',
    ].map(name => ({ result: { data: { user: { name } } }, delay: 10 }));

    const query = gql`
      subscription UserInfo {
        user {
          name
        }
      }
    `;
    const triggerQuery = gql`
      subscription Trigger {
        trigger
      }
    `;

    const userLink = new MockSubscriptionLink();
    const triggerLink = new MockSubscriptionLink();
    const link = new ApolloLink((o, f) => f(o)).split(
      ({ query: document }) => document === query,
      userLink,
      triggerLink,
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    let unsubscribed = false;
    let output;
    @graphql(triggerQuery)
    @graphql(query, {
      shouldResubscribe: (props, nextProps) => {
        return nextProps.data.trigger === 'trigger resubscribe';
      },
    })
    class Container extends React.Component<any, any> {
      componentWillMount() {
        expect(this.props.data.loading).toBeTruthy();
      }
      componentWillReceiveProps({ data: { loading, user } }) {
        try {
          // odd counts will be outer wrapper getting subscriptions - ie unchanged
          expect(loading).toBeFalsy();
          if (count === 0) expect(user).toEqual(results[0].result.user);
          if (count === 1) expect(user).toEqual(results[0].result.user);
          if (count === 2) expect(user).toEqual(results[1].result.user);
          if (count === 3) expect(user).toEqual(results[1].result.user);
          if (count === 4) expect(user).toEqual(results3[0].result.user);
          if (count === 5) {
            expect(user).toEqual(results3[0].result.user);
            output.unmount();

            done();
          }
        } catch (e) {
          done.fail(e);
        }

        count++;
      }
      render() {
        return null;
      }
    }

    const interval = setInterval(() => {
      try {
        if (count > 2) {
          userLink.simulateResult(results3[count - 2]);
        } else {
          userLink.simulateResult(results[count]);
        }
        triggerLink.simulateResult(triggerResults[count]);
      } catch (ex) {
        clearInterval(interval);
      }
      if (count > 3) clearInterval(interval);
    }, 50);

    output = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
