import * as React from 'react';
import gql from 'graphql-tag';
import { mount, ReactWrapper } from 'enzyme';

import { ApolloClient } from 'apollo-client';
import { ApolloLink, Operation } from 'apollo-link';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import { MockSubscriptionLink } from '../../src/test-utils';
import { ApolloProvider } from '../../src';
import catchAsyncError from '../test-utils/catchAsyncError';
import { Subscription } from '../../src';

const results = ['Luke Skywalker', 'Han Solo', 'Darth Vader', 'Leia Skywalker'].map(name => ({
  result: { data: { user: { name } } },
}));

let wrapper: ReactWrapper<any, any> | null;

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

const cache = new Cache({ addTypename: false });
const link = new MockSubscriptionLink();
const client = new ApolloClient({
  link,
  cache,
});

it('executes the subscription', done => {
  jest.useFakeTimers();

  let count = 0;

  const Component = () => (
    <Subscription subscription={subscription}>
      {result => {
        const { loading, data, error } = result;

        catchAsyncError(done, () => {
          if (count === 0) {
            expect(loading).toBe(true);
            expect(error).toBeUndefined();
            expect(data).toBeUndefined();
          }
          if (count === 1) {
            expect(loading).toBe(false);
            expect(data).toEqual(results[0].result.data);
          }
          if (count === 2) {
            expect(loading).toBe(false);
            expect(data).toEqual(results[1].result.data);
          }
          if (count === 3) {
            expect(loading).toBe(false);
            expect(data).toEqual(results[2].result.data);
          }
          if (count === 4) {
            expect(loading).toBe(false);
            expect(data).toEqual(results[3].result.data);
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

it('calls onSubscriptionData if given', done => {
  jest.useFakeTimers();

  let count = 0;

  const Component = () => (
    <Subscription
      subscription={subscription}
      onSubscriptionData={opts => {
        expect(opts.client).toBeInstanceOf(ApolloClient);
        const { data } = opts.subscriptionData;
        expect(data).toEqual(results[count].result.data);
        if (count === 3) done();
        count++;
      }}
    />
  );

  wrapper = mount(
    <ApolloProvider client={client}>
      <Component />
    </ApolloProvider>,
  );

  const interval = setInterval(() => {
    link.simulateResult(results[count]);
    if (count >= 3) clearInterval(interval);
  }, 10);

  jest.runTimersToTime(40);
});

it('should call onSubscriptionComplete if specified', done => {
  jest.useFakeTimers();

  let count = 0;

  const Component = () => (
    <Subscription
      subscription={subscription}
      onSubscriptionData={() => {
        count++;
      }}
      onSubscriptionComplete={() => {
        done();
      }}
    />
  );

  wrapper = mount(
    <ApolloProvider client={client}>
      <Component />
    </ApolloProvider>,
  );

  const interval = setInterval(() => {
    link.simulateResult(results[count], count === 3);
    if (count >= 3) clearInterval(interval);
  }, 10);

  jest.runTimersToTime(40);
});

it('executes subscription for the variables passed in the props', done => {
  expect.assertions(4);
  const subscriptionWithVariables = gql`
    subscription UserInfo($name: String) {
      user(name: $name) {
        name
      }
    }
  `;

  const variables = { name: 'Luke Skywalker' };

  class MockSubscriptionLinkOverride extends MockSubscriptionLink {
    request(req: Operation) {
      catchAsyncError(done, () => {
        expect(req.variables).toEqual(variables);
      });
      return super.request(req);
    }
  }

  const mockLink = new MockSubscriptionLinkOverride();

  const mockClient = new ApolloClient({
    link: mockLink,
    cache,
  });

  let count = 0;

  const Component = () => (
    <Subscription subscription={subscriptionWithVariables} variables={variables}>
      {result => {
        const { loading, data } = result;

        catchAsyncError(done, () => {
          if (count === 0) {
            expect(loading).toBe(true);
          } else if (count === 1) {
            expect(loading).toBe(false);
            expect(data).toEqual(results[0].result.data);
            done();
          }
        });
        count++;
        return null;
      }}
    </Subscription>
  );

  wrapper = mount(
    <ApolloProvider client={mockClient}>
      <Component />
    </ApolloProvider>,
  );

  mockLink.simulateResult(results[0]);
});

it('does not execute if variables have not changed', done => {
  expect.assertions(4);
  const subscriptionWithVariables = gql`
    subscription UserInfo($name: String) {
      user(name: $name) {
        name
      }
    }
  `;

  const name = 'Luke Skywalker';

  class MockSubscriptionLinkOverride extends MockSubscriptionLink {
    request(req: Operation) {
      catchAsyncError(done, () => {
        expect(req.variables).toEqual({ name });
      });
      return super.request(req);
    }
  }

  const mockLink = new MockSubscriptionLinkOverride();

  const mockClient = new ApolloClient({
    link: mockLink,
    cache,
  });

  let count = 0;

  class Component extends React.Component {
    render() {
      return (
        <Subscription subscription={subscriptionWithVariables} variables={{ name }}>
          {result => {
            const { loading, data } = result;

            catchAsyncError(done, () => {
              if (count === 0) {
                expect(loading).toBe(true);
              } else if (count === 1) {
                expect(loading).toBe(false);
                setTimeout(() => this.forceUpdate());
              } else if (count === 2) {
                expect(loading).toBe(false);
                done();
              }
            });
            count++;
            return null;
          }}
        </Subscription>
      );
    }
  }

  wrapper = mount(
    <ApolloProvider client={mockClient}>
      <Component />
    </ApolloProvider>,
  );

  mockLink.simulateResult(results[0]);
});

it('renders an error', done => {
  const subscriptionWithVariables = gql`
    subscription UserInfo($name: String) {
      user(name: $name) {
        name
      }
    }
  `;

  const variables = {
    name: 'Luke Skywalker',
  };

  const subscriptionError = {
    error: new Error('error occurred'),
  };

  let count = 0;
  const Component = () => (
    <Subscription subscription={subscriptionWithVariables} variables={variables}>
      {result => {
        const { loading, data, error } = result;
        catchAsyncError(done, () => {
          if (count === 0) {
            expect(loading).toBe(true);
            expect(error).toBeUndefined();
          } else if (count === 1) {
            expect(loading).toBe(false);
            expect(error).toEqual(new Error('error occurred'));
            expect(data).toBeUndefined();
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

  link.simulateResult(subscriptionError);
});

describe('should update', () => {
  it('if the client changes', done => {
    const link2 = new MockSubscriptionLink();
    const client2 = new ApolloClient({
      link: link2,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;

    class Component extends React.Component {
      state = {
        client: client,
      };

      render() {
        return (
          <ApolloProvider client={this.state.client}>
            <Subscription subscription={subscription}>
              {result => {
                const { loading, data } = result;
                catchAsyncError(done, () => {
                  if (count === 0) {
                    expect(loading).toBeTruthy();
                    expect(data).toBeUndefined();
                  } else if (count === 1) {
                    expect(loading).toBeFalsy();
                    expect(data).toEqual(results[0].result.data);
                    setTimeout(() => {
                      this.setState(
                        {
                          client: client2,
                        },
                        () => {
                          link2.simulateResult(results[1]);
                        },
                      );
                    });
                  } else if (count === 2) {
                    expect(loading).toBeTruthy();
                    expect(data).toBeUndefined();
                  } else if (count === 3) {
                    expect(loading).toBeFalsy();
                    expect(data).toEqual(results[1].result.data);
                    done();
                  }
                });

                count++;
                return null;
              }}
            </Subscription>
          </ApolloProvider>
        );
      }
    }

    wrapper = mount(<Component />);

    link.simulateResult(results[0]);
  });

  it('if the query changes', done => {
    const subscriptionHero = gql`
      subscription HeroInfo {
        hero {
          name
        }
      }
    `;

    const heroResult = {
      result: {
        data: {
          hero: {
            name: 'Chewie',
          },
        },
      },
    };

    const userLink = new MockSubscriptionLink();
    const heroLink = new MockSubscriptionLink();
    const linkCombined = new ApolloLink((o, f) => (f ? f(o) : null)).split(
      ({ operationName }) => operationName === 'HeroInfo',
      heroLink,
      userLink,
    );

    const mockClient = new ApolloClient({
      link: linkCombined,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;

    class Component extends React.Component {
      state = {
        subscription,
      };

      render() {
        return (
          <Subscription subscription={this.state.subscription}>
            {result => {
              const { loading, data } = result;
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(loading).toBeTruthy();
                  expect(data).toBeUndefined();
                } else if (count === 1) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(results[0].result.data);
                  setTimeout(() => {
                    this.setState(
                      {
                        subscription: subscriptionHero,
                      },
                      () => {
                        heroLink.simulateResult(heroResult);
                      },
                    );
                  });
                } else if (count === 2) {
                  expect(loading).toBeTruthy();
                  expect(data).toBeUndefined();
                } else if (count === 3) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(heroResult.result.data);
                  done();
                }
              });
              count++;
              return null;
            }}
          </Subscription>
        );
      }
    }

    wrapper = mount(
      <ApolloProvider client={mockClient}>
        <Component />
      </ApolloProvider>,
    );

    userLink.simulateResult(results[0]);
  });

  it('if the variables change', done => {
    const subscriptionWithVariables = gql`
      subscription UserInfo($name: String) {
        user(name: $name) {
          name
        }
      }
    `;

    const variablesLuke = { name: 'Luke Skywalker' };
    const variablesHan = { name: 'Han Solo' };

    const dataLuke = {
      user: {
        name: 'Luke Skywalker',
      },
    };

    const dataHan = {
      user: {
        name: 'Han Solo',
      },
    };

    class MockSubscriptionLinkOverride extends MockSubscriptionLink {
      variables: any;
      request(req: Operation) {
        this.variables = req.variables;
        return super.request(req);
      }

      simulateResult() {
        if (this.variables.name === 'Luke Skywalker') {
          return super.simulateResult({
            result: {
              data: dataLuke,
            },
          });
        } else if (this.variables.name === 'Han Solo') {
          return super.simulateResult({
            result: {
              data: dataHan,
            },
          });
        }
      }
    }

    const mockLink = new MockSubscriptionLinkOverride();

    const mockClient = new ApolloClient({
      link: mockLink,
      cache,
    });

    let count = 0;

    class Component extends React.Component {
      state = {
        variables: variablesLuke,
      };

      render() {
        return (
          <Subscription subscription={subscriptionWithVariables} variables={this.state.variables}>
            {result => {
              const { loading, data } = result;
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(loading).toBeTruthy();
                  expect(data).toBeUndefined();
                } else if (count === 1) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(dataLuke);
                  setTimeout(() => {
                    this.setState(
                      {
                        variables: variablesHan,
                      },
                      () => {
                        mockLink.simulateResult();
                      },
                    );
                  });
                } else if (count === 2) {
                  expect(loading).toBeTruthy();
                  expect(data).toBeUndefined();
                } else if (count === 3) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(dataHan);
                  done();
                }
              });

              count++;
              return null;
            }}
          </Subscription>
        );
      }
    }

    wrapper = mount(
      <ApolloProvider client={mockClient}>
        <Component />
      </ApolloProvider>,
    );

    mockLink.simulateResult();
  });
});

describe('should not update', () => {
  const variablesLuke = { name: 'Luke Skywalker' };
  const variablesHan = { name: 'Han Solo' };

  const dataLuke = {
    user: {
      name: 'Luke Skywalker',
    },
  };

  const dataHan = {
    user: {
      name: 'Han Solo',
    },
  };

  class MockSubscriptionLinkOverride extends MockSubscriptionLink {
    variables: any;
    request(req: Operation) {
      this.variables = req.variables;
      return super.request(req);
    }

    simulateResult() {
      if (this.variables.name === 'Luke Skywalker') {
        return super.simulateResult({
          result: {
            data: dataLuke,
          },
        });
      } else if (this.variables.name === 'Han Solo') {
        return super.simulateResult({
          result: {
            data: dataHan,
          },
        });
      }
    }
  }

  it('if shouldResubscribe is false', done => {
    const subscriptionWithVariables = gql`
      subscription UserInfo($name: String) {
        user(name: $name) {
          name
        }
      }
    `;

    const mockLink = new MockSubscriptionLinkOverride();

    const mockClient = new ApolloClient({
      link: mockLink,
      cache,
    });

    let count = 0;

    class Component extends React.Component {
      state = {
        variables: variablesLuke,
      };

      render() {
        return (
          <Subscription
            subscription={subscriptionWithVariables}
            variables={this.state.variables}
            shouldResubscribe={false}
          >
            {result => {
              const { loading, data } = result;
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(loading).toBeTruthy();
                  expect(data).toBeUndefined();
                } else if (count === 1) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(dataLuke);
                  setTimeout(() => {
                    this.setState(
                      {
                        variables: variablesHan,
                      },
                      () => {
                        mockLink.simulateResult();
                      },
                    );
                  });
                } else if (count === 2) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(dataLuke);
                  done();
                }
              });

              count++;
              return null;
            }}
          </Subscription>
        );
      }
    }

    wrapper = mount(
      <ApolloProvider client={mockClient}>
        <Component />
      </ApolloProvider>,
    );

    mockLink.simulateResult();
  });

  it('if shouldResubscribe returns false', done => {
    const subscriptionWithVariables = gql`
      subscription UserInfo($name: String) {
        user(name: $name) {
          name
        }
      }
    `;

    const mockLink = new MockSubscriptionLinkOverride();

    const mockClient = new ApolloClient({
      link: mockLink,
      cache,
    });

    let count = 0;

    class Component extends React.Component {
      state = {
        variables: variablesLuke,
      };

      render() {
        return (
          <Subscription
            subscription={subscriptionWithVariables}
            variables={this.state.variables}
            shouldResubscribe={() => false}
          >
            {result => {
              const { loading, data } = result;
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(loading).toBeTruthy();
                  expect(data).toBeUndefined();
                } else if (count === 1) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(dataLuke);
                  setTimeout(() => {
                    this.setState(
                      {
                        variables: variablesHan,
                      },
                      () => {
                        mockLink.simulateResult();
                      },
                    );
                  });
                } else if (count === 2) {
                  expect(loading).toBeFalsy();
                  expect(data).toEqual(dataLuke);
                  done();
                }
              });

              count++;
              return null;
            }}
          </Subscription>
        );
      }
    }

    wrapper = mount(
      <ApolloProvider client={mockClient}>
        <Component />
      </ApolloProvider>,
    );

    mockLink.simulateResult();
  });
});
