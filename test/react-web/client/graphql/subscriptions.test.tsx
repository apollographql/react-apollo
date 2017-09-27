import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';
import { ApolloError } from 'apollo-client/errors';

declare function require(name: string);

import { mockSubscriptionNetworkInterface } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('subscriptions', () => {
  const results = [
    'James Baxley',
    'John Pinkerton',
    'Sam Clairidge',
    'Ben Coleman',
  ].map(name => ({ result: { user: { name } }, delay: 10 }));

  it('binds a subscription to props', () => {
    const query = gql`
      subscription UserInfo {
        user {
          name
        }
      }
    `;
    const networkInterface = mockSubscriptionNetworkInterface([
      { request: { query }, results: [...results] },
    ]);
    const client = new ApolloClient({ networkInterface, addTypename: false });
    // XXX fix in apollo-client
    client.subscribe = client.subscribe.bind(client);

    const ContainerWithData = graphql(query)(({ data }) => {
      // tslint:disable-line
      expect(data).toBeTruthy();
      expect(data.ownProps).toBeFalsy();
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
    const networkInterface = mockSubscriptionNetworkInterface([
      { request: { query, variables }, results: [...results] },
    ]);
    const client = new ApolloClient({ networkInterface, addTypename: false });
    // XXX fix in apollo-client
    client.subscribe = client.subscribe.bind(client);

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

  it('does not swallow children errors', () => {
    const query = gql`
      subscription UserInfo {
        user {
          name
        }
      }
    `;
    const networkInterface = mockSubscriptionNetworkInterface([
      { request: { query }, results: [...results] },
    ]);
    const client = new ApolloClient({ networkInterface, addTypename: false });
    // XXX fix in apollo-client
    client.subscribe = client.subscribe.bind(client);

    let bar;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    try {
      renderer.create(
        <ApolloProvider client={client}>
          <ContainerWithData />
        </ApolloProvider>,
      );
      throw new Error();
    } catch (e) {
      expect(e.name).toMatch(/TypeError/);
    }
  });

  it('executes a subscription', done => {
    const query = gql`
      subscription UserInfo {
        user {
          name
        }
      }
    `;
    const networkInterface = mockSubscriptionNetworkInterface([
      { request: { query }, results: [...results] },
    ]);
    const client = new ApolloClient({ networkInterface, addTypename: false });
    // XXX fix in apollo-client
    client.subscribe = client.subscribe.bind(client);

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
      networkInterface.fireResult(0);
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
    ].map(trigger => ({ result: { trigger }, delay: 10 }));
    //These are the results fro the resubscription
    const results3 = [
      'NewUser: 1',
      'NewUser: 2',
      'NewUser: 3',
      'NewUser: 4',
    ].map(name => ({ result: { user: { name } }, delay: 10 }));

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
    const networkInterface = mockSubscriptionNetworkInterface([
      { request: { query }, results: [...results] },
      { request: { query: triggerQuery }, results: [...triggerResults] },
      { request: { query }, results: [...results3] },
    ]);
    const client = new ApolloClient({ networkInterface, addTypename: false });
    // XXX fix in apollo-client
    client.subscribe = client.subscribe.bind(client);

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
        // odd counts will be outer wrapper getting subscriptions - ie unchanged
        expect(loading).toBeFalsy();
        if (count === 0) expect(user).toEqual(results[0].result.user);
        if (count === 1) expect(user).toEqual(results[0].result.user);
        if (count === 2) expect(user).toEqual(results[1].result.user);
        if (count === 3) expect(user).toEqual(results[1].result.user);
        if (count <= 1) {
          expect(networkInterface.mockedSubscriptionsById[0]).toBeDefined();
        }
        expect(networkInterface.mockedSubscriptionsById[1]).toBeDefined();
        if (count === 2) {
          expect(networkInterface.mockedSubscriptionsById[0]).toBeDefined();
          //expect(networkInterface.mockedSubscriptionsById[2]).toBeDefined();
        }
        if (count === 3) {
          //it's resubscribed
          expect(networkInterface.mockedSubscriptionsById[0]).not.toBeDefined();
          expect(networkInterface.mockedSubscriptionsById[2]).toBeDefined();
          expect(user).toEqual(results[1].result.user);
        }
        if (count === 4) {
          //it's got result of new subscription
          expect(user).toEqual(results3[0].result.user);
        }
        if (count === 5) {
          expect(user).toEqual(results3[0].result.user);
          output.unmount();
          expect(networkInterface.mockedSubscriptionsById[0]).not.toBeDefined();
          // expect(
          //   networkInterface.mockedSubscriptionsById[1]
          // ).not.toBeDefined();
          expect(networkInterface.mockedSubscriptionsById[3]).not.toBeDefined();
          done();
        }

        count++;
      }
      render() {
        return null;
      }
    }

    const interval = setInterval(() => {
      try {
        networkInterface.fireResult(count > 2 ? 2 : 0);
        networkInterface.fireResult(1);
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
