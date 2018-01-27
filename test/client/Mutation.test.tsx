import * as React from 'react';
import { mount } from 'enzyme';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';

import { ApolloProvider, Mutation, Query } from '../../src';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';

import stripSymbols from '../test-utils/stripSymbols';

const mutation = gql`
  mutation createTodo($text: String!) {
    createTodo {
      id
      text
      completed
      __typename
    }
    __typename
  }
`;

const data = {
  createTodo: {
    __typename: 'Todo',
    id: '99',
    text: 'This one was created with a mutation.',
    completed: true,
  },
  __typename: 'Mutation',
};

const variables = {
  text: 'play tennis',
};

const mocks = [
  {
    request: { query: mutation, variables },
    result: { data },
  },
];

const cache = new Cache({ addTypename: false });

it('performs a mutation', done => {
  let count = 0;
  const Component = () => (
    <Mutation mutation={mutation} variables={variables}>
      {(createTodo, result) => {
        if (count === 0) {
          expect(result).toBeUndefined();
          setTimeout(() => {
            createTodo();
          });
        } else if (count === 1) {
          expect(result).toEqual({
            loading: true,
          });
        } else if (count === 2) {
          expect(result).toEqual({
            loading: false,
            data,
          });
          done();
        }
        count++;
        return <div />;
      }}
    </Mutation>
  );

  mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
});

it('calls the onCompleted prop as soon as the mutation is complete', done => {
  let onCompletedCalled = false;

  class Component extends React.Component {
    state = {
      mutationDone: false,
    };

    onCompleted = mutationData => {
      expect(mutationData).toEqual(data);
      onCompletedCalled = true;
      this.setState({
        mutationDone: true,
      });
    };

    render() {
      return (
        <Mutation
          mutation={mutation}
          variables={variables}
          onCompleted={this.onCompleted}
        >
          {(createTodo, result) => {
            if (!result) {
              expect(this.state.mutationDone).toBe(false);
              setTimeout(() => {
                createTodo();
              });
            }
            if (onCompletedCalled) {
              expect(this.state.mutationDone).toBe(true);
              done();
            }
            return null;
          }}
        </Mutation>
      );
    }
  }

  mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
});

it('renders result of the children render prop', () => {
  const Component = () => (
    <Mutation mutation={mutation} variables={variables}>
      {(createTodo, result) => {
        return <div />;
      }}
    </Mutation>
  );

  const wrapper = mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
  expect(wrapper.find('div').exists()).toBe(true);
});

it('renders an error state', done => {
  let count = 0;
  const Component = () => (
    <Mutation mutation={mutation}>
      {(createTodo, result) => {
        if (count === 0) {
          setTimeout(() => {
            createTodo();
          });
        } else if (count === 1) {
          expect(result.loading).toBeTruthy();
        } else if (count === 2) {
          expect(result.error).toEqual(
            new Error('Network error: error occurred'),
          );
          done();
        }
        count++;
        return <div />;
      }}
    </Mutation>
  );

  const mockError = [
    {
      request: { query: mutation },
      error: new Error('error occurred'),
    },
  ];

  mount(
    <MockedProvider mocks={mockError}>
      <Component />
    </MockedProvider>,
  );
});

it('calls the onError prop if the mutation encounters an error', done => {
  let onRenderCalled = false;

  class Component extends React.Component {
    state = {
      mutationError: false,
    };

    onError = error => {
      expect(error).toEqual(new Error('Network error: error occurred'));
      onRenderCalled = true;
      this.setState({
        mutationError: true,
      });
    };

    render() {
      const { mutationError } = this.state;

      return (
        <Mutation mutation={mutation} onError={this.onError}>
          {(createTodo, result) => {
            if (!result) {
              expect(mutationError).toBe(false);
              setTimeout(() => {
                createTodo();
              });
            }
            if (onRenderCalled) {
              expect(mutationError).toBe(true);
              done();
            }
            return null;
          }}
        </Mutation>
      );
    }
  }

  const mockError = [
    {
      request: { query: mutation },
      error: new Error('error occurred'),
    },
  ];

  mount(
    <MockedProvider mocks={mockError}>
      <Component />
    </MockedProvider>,
  );
});

it('returns an optimistic response', done => {
  const link = mockSingleLink(...mocks);
  const client = new ApolloClient({
    link,
    cache,
  });

  const optimisticResponse = {
    createTodo: {
      id: '99',
      text: 'This is an optimistic response',
      completed: false,
      __typename: 'Todo',
    },
    __typename: 'Mutation',
  };

  let count = 0;
  const Component = () => (
    <Mutation
      mutation={mutation}
      variables={variables}
      optimisticResponse={optimisticResponse}
    >
      {(createTodo, result) => {
        if (count === 0) {
          expect(result).toBeUndefined();
          setTimeout(() => {
            createTodo();
            const dataInStore = client.cache.extract(true);
            expect(dataInStore['Todo:99']).toEqual(
              optimisticResponse.createTodo,
            );
          });
        } else if (count === 1) {
          expect(result).toEqual({
            loading: true,
          });
        } else if (count === 2) {
          expect(result).toEqual({
            loading: false,
            data,
          });
          done();
        }
        count++;
        return <div />;
      }}
    </Mutation>
  );

  mount(
    <ApolloProvider client={client}>
      <Component />
    </ApolloProvider>,
  );
});

it('has refetchQueries in the props', done => {
  const query = gql`
    query getTodo {
      todo {
        id
        text
        completed
        __typename
      }
      __typename
    }
  `;

  const queryData = {
    todo: {
      id: '1',
      text: 'todo from query',
      completed: false,
      __typename: 'Todo',
    },
    __typename: 'Query',
  };

  const mocksWithQuery = [
    ...mocks,
    // TODO: Somehow apollo-client makes 3 request
    // when refetch queries is enabled??
    {
      request: { query },
      result: { data: queryData },
    },
    {
      request: { query },
      result: { data: queryData },
    },
    {
      request: { query },
      result: { data: queryData },
    },
  ];

  const refetchQueries = [
    {
      query,
    },
  ];

  let count = 0;
  const Component = () => (
    <Mutation
      mutation={mutation}
      variables={variables}
      refetchQueries={refetchQueries}
    >
      {(createTodo, resultMutation) => (
        <Query query={query}>
          {resultQuery => {
            if (count === 0) {
              setTimeout(() => {
                createTodo();
              });
            } else if (count === 1) {
              expect(resultMutation.loading).toBe(true);
              expect(resultQuery.loading).toBe(true);
            } else if (count === 2) {
              expect(resultMutation.loading).toBe(true);
              expect(stripSymbols(resultQuery.data)).toEqual(queryData);
              done();
            }
            count++;
            return null;
          }}
        </Query>
      )}
    </Mutation>
  );

  mount(
    <MockedProvider mocks={mocksWithQuery}>
      <Component />
    </MockedProvider>,
  );
});

it('has an update prop for updating the store after the mutation', done => {
  const update = (proxy, response) => {
    expect(response.data).toEqual(data);
    done();
  };

  let count = 0;
  const Component = () => (
    <Mutation mutation={mutation} variables={variables} update={update}>
      {(createTodo, result) => {
        if (count === 0) {
          setTimeout(() => {
            createTodo();
          });
        }
        count++;
        return null;
      }}
    </Mutation>
  );

  mount(
    <MockedProvider mocks={mocks}>
      <Component />
    </MockedProvider>,
  );
});

it('updates if the client changes', done => {
  const link1 = mockSingleLink({
    request: { query: mutation, variables },
    result: { data },
  });
  const client1 = new ApolloClient({
    link: link1,
    cache: new Cache({ addTypename: false }),
  });

  const data2 = {
    createTodo: {
      __typename: 'Todo',
      id: '100',
      text: 'After updating client.',
      completed: false,
    },
    __typename: 'Mutation',
  };

  const link2 = mockSingleLink({
    request: { query: mutation, variables },
    result: { data: data2 },
  });

  const client2 = new ApolloClient({
    link: link2,
    cache: new Cache({ addTypename: false }),
  });

  let count = 0;
  class Component extends React.Component {
    state = {
      client: client1,
    };

    render() {
      return (
        <ApolloProvider client={this.state.client}>
          <Mutation mutation={mutation} variables={variables}>
            {(createTodo, result) => {
              if (count === 0) {
                expect(result).toBeUndefined();
                setTimeout(() => {
                  createTodo();
                });
              } else if (count === 2) {
                expect(result.data).toEqual(data);
                setTimeout(() => {
                  this.setState({
                    client: client2,
                  });
                });
              } else if (count === 3) {
                expect(result).toBeUndefined();
                setTimeout(() => {
                  createTodo();
                });
              } else if (count === 5) {
                expect(result.data).toEqual(data2);
                done();
              }
              count++;
              return null;
            }}
          </Mutation>
        </ApolloProvider>
      );
    }
  }

  mount(<Component />);
});

it('errors if a query is passed instead of a mutation', () => {
  const query = gql`
    query todos {
      todos {
        id
      }
    }
  `;

  // Prevent error from being logged in console of test.
  const errorLogger = console.error;
  console.error = () => {}; // tslint:disable-line

  expect(() => {
    mount(
      <MockedProvider>
        <Mutation mutation={query}>{() => null}</Mutation>
      </MockedProvider>,
    );
  }).toThrowError(
    'The <Mutation /> component requires a graphql mutation, but got a query.',
  );

  console.log = errorLogger;
});

it('errors when changing from mutation to a query', done => {
  const query = gql`
    query todos {
      todos {
        id
      }
    }
  `;

  class Component extends React.Component {
    state = {
      query: mutation,
    };

    componentDidCatch(e) {
      expect(e).toEqual(
        new Error(
          'The <Mutation /> component requires a graphql mutation, but got a query.',
        ),
      );
      done();
    }
    render() {
      return (
        <Mutation mutation={this.state.query}>
          {() => {
            setTimeout(() => {
              this.setState({
                query,
              });
            });
            return null;
          }}
        </Mutation>
      );
    }
  }

  // Prevent error from being logged in console of test.
  const errorLogger = console.error;
  console.error = () => {}; // tslint:disable-line

  mount(
    <MockedProvider>
      <Component />
    </MockedProvider>,
  );

  console.log = errorLogger;
});

it('errors if a subscription is passed instead of a mutation', () => {
  const subscription = gql`
    subscription todos {
      todos {
        id
      }
    }
  `;

  // Prevent error from being logged in console of test.
  const errorLogger = console.error;
  console.error = () => {}; // tslint:disable-line

  expect(() => {
    mount(
      <MockedProvider>
        <Mutation mutation={subscription}>{() => null}</Mutation>
      </MockedProvider>,
    );
  }).toThrowError(
    'The <Mutation /> component requires a graphql mutation, but got a subscription.',
  );

  console.log = errorLogger;
});

it('errors when changing from mutation to a subscription', done => {
  const subscription = gql`
    subscription todos {
      todos {
        id
      }
    }
  `;

  class Component extends React.Component {
    state = {
      query: mutation,
    };

    componentDidCatch(e) {
      expect(e).toEqual(
        new Error(
          'The <Mutation /> component requires a graphql mutation, but got a subscription.',
        ),
      );
      done();
    }
    render() {
      return (
        <Mutation mutation={this.state.query}>
          {() => {
            setTimeout(() => {
              this.setState({
                query: subscription,
              });
            });
            return null;
          }}
        </Mutation>
      );
    }
  }

  // Prevent error from being logged in console of test.
  const errorLogger = console.error;
  console.error = () => {}; // tslint:disable-line

  mount(
    <MockedProvider>
      <Component />
    </MockedProvider>,
  );

  console.log = errorLogger;
});
