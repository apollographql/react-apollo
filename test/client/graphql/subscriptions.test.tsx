import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { MockSubscriptionLink } from '../../../src/test-utils';
import { ApolloProvider, ChildProps, graphql } from '../../../src';
import stripSymbols from '../../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';

describe('subscriptions', () => {
  let error: typeof console.error;
  let wrapper: renderer.ReactTestRenderer | null;
  beforeEach(() => {
    jest.useRealTimers();
    error = console.error;
    console.error = jest.fn(() => {}); // tslint:disable-line
  });
  afterEach(() => {
    console.error = error;
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  const results = [
    'James Baxley',
    'John Pinkerton',
    'Sam Claridge',
    'Ben Coleman',
  ].map(name => ({
    result: { data: { user: { name } } },
    delay: 10,
  }));

  it('binds a subscription to props', () => {
    const query: DocumentNode = gql`
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

    interface Props {}
    interface Data {
      user: { name: string };
    }

    const ContainerWithData = graphql<Props, Data>(query)(
      ({ data }: ChildProps<Props, Data>) => {
        expect(data).toBeTruthy();
        expect(data!.user).toBeFalsy();
        expect(data!.loading).toBeTruthy();
        return null;
      },
    );

    wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });

  it('includes the variables in the props', () => {
    const query: DocumentNode = gql`
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

    interface Variables {
      name: string;
    }

    interface Data {
      user: { name: string };
    }

    const ContainerWithData = graphql<Variables, Data>(query)(
      ({ data }: ChildProps<Variables, Data>) => {
        expect(data).toBeTruthy();
        expect(data!.variables).toEqual(variables);
        return null;
      },
    );

    wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData name={'James Baxley'} />
      </ApolloProvider>,
    );
  });

  it('does not swallow children errors', done => {
    const query: DocumentNode = gql`
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

    let bar: any;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    class ErrorBoundary extends React.Component {
      componentDidCatch(e: any) {
        expect(e.name).toMatch(/TypeError/);
        expect(e.message).toMatch(/bar is not a function/);
        done();
      }

      render() {
        return this.props.children;
      }
    }

    wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <ContainerWithData />
        </ErrorBoundary>
      </ApolloProvider>,
    );
  });

  it('executes a subscription', done => {
    jest.useFakeTimers();

    const query: DocumentNode = gql`
      subscription UserInfo {
        user {
          name
        }
      }
    `;

    interface Data {
      user: { name: string };
    }
    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    const Container = graphql<{}, Data>(query)(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillMount() {
          expect(this.props.data!.loading).toBeTruthy();
        }
        componentWillReceiveProps(props: ChildProps<{}, Data>) {
          const { loading, user } = props.data!;

          expect(loading).toBeFalsy();
          if (count === 0)
            expect(stripSymbols(user)).toEqual(results[0].result.data.user);
          if (count === 1)
            expect(stripSymbols(user)).toEqual(results[1].result.data.user);
          if (count === 2)
            expect(stripSymbols(user)).toEqual(results[2].result.data.user);
          if (count === 3) {
            expect(stripSymbols(user)).toEqual(results[3].result.data.user);
            done();
          }
          count++;
        }
        render() {
          return null;
        }
      },
    );

    const interval = setInterval(() => {
      link.simulateResult(results[count]);
      if (count > 3) clearInterval(interval);
    }, 50);

    wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );

    jest.runTimersToTime(230);
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
    ].map(trigger => ({
      result: { data: { trigger } },
      delay: 10,
    }));

    //These are the results from the resubscription
    const results3 = [
      'NewUser: 1',
      'NewUser: 2',
      'NewUser: 3',
      'NewUser: 4',
    ].map(name => ({
      result: { data: { user: { name } } },
      delay: 10,
    }));

    const query: DocumentNode = gql`
      subscription UserInfo {
        user {
          name
        }
      }
    `;
    interface QueryData {
      user: { name: string };
    }

    const triggerQuery: DocumentNode = gql`
      subscription Trigger {
        trigger
      }
    `;
    interface TriggerData {
      trigger: string;
    }

    const userLink = new MockSubscriptionLink();
    const triggerLink = new MockSubscriptionLink();
    const link = new ApolloLink((o, f) => (f ? f(o) : null)).split(
      ({ operationName }) => operationName === 'UserInfo',
      userLink,
      triggerLink,
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;

    type TriggerQueryChildProps = ChildProps<{}, TriggerData>;
    type ComposedProps = ChildProps<TriggerQueryChildProps, QueryData>;

    const Container = graphql<{}, TriggerData>(triggerQuery)(
      graphql<TriggerQueryChildProps, QueryData>(query, {
        shouldResubscribe: nextProps => {
          return nextProps.data!.trigger === 'trigger resubscribe';
        },
      })(
        class extends React.Component<ComposedProps> {
          componentWillMount() {
            expect(this.props.data!.loading).toBeTruthy();
          }
          componentWillReceiveProps(props: ComposedProps) {
            const { loading, user } = props.data!;
            try {
              // odd counts will be outer wrapper getting subscriptions - ie unchanged
              expect(loading).toBeFalsy();
              if (count === 0)
                expect(stripSymbols(user)).toEqual(results[0].result.data.user);
              if (count === 1)
                expect(stripSymbols(user)).toEqual(results[0].result.data.user);
              if (count === 2)
                expect(stripSymbols(user)).toEqual(results[2].result.data.user);
              if (count === 3)
                expect(stripSymbols(user)).toEqual(results[2].result.data.user);
              if (count === 4)
                expect(stripSymbols(user)).toEqual(
                  results3[2].result.data.user,
                );
              if (count === 5) {
                expect(stripSymbols(user)).toEqual(
                  results3[2].result.data.user,
                );
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
        },
      ),
    );

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

    wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
