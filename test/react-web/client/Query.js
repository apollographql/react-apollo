import React from 'react';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import { mount } from 'enzyme';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import ApolloProvider from '../../../src/ApolloProvider';
import Query from '../../../src/Query';
import { MockedProvider, mockSingleLink } from '../../../src/test-utils';

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

const mocks = [
  {
    request: { query },
    result: { data },
  },
];

const options = {
  query,
};

const catchAsyncError = (done, cb) => {
  try {
    cb();
  } catch (e) {
    done.fail(e);
  }
};

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.log(error);
    console.log(errorInfo);
  }

  render() {
    return this.props.children;
  }
}

describe('Query component', () => {
  it('calls the children prop', done => {
    const Component = () => (
      <Query query={query}>
        {result => {
          catchAsyncError(done, () => {
            if (result.loading) {
              expect(result).toMatchSnapshot(
                'result in render prop while loading',
              );
            } else {
              expect(result).toMatchSnapshot('result in render prop');
              done();
            }
          });

          return null;
        }}
      </Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('renders using the children prop', done => {
    const Component = () => <Query query={query}>{result => <div />}</Query>;

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
    catchAsyncError(done, () => {
      expect(wrapper.find('div').exists()).toBeTruthy();
      done();
    });
  });

  it('renders the error state', done => {
    const mockError = [
      {
        request: { query },
        error: new Error('error occurred'),
      },
    ];

    const Component = () => (
      <Query query={query}>
        {result => {
          if (result.loading) {
            return null;
          }
          catchAsyncError(done, () => {
            expect(result.error).toEqual(
              new Error('Network error: error occurred'),
            );
            done();
          });
          return null;
        }}
      </Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={mockError} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('includes variables in the render props', done => {
    const queryWithVariables = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const mocksWithVariable = [
      {
        request: {
          query: queryWithVariables,
          // TODO: Currently, removing this variables field does not crash the test. We need to verify
          // that the variables are included in the request.
          variables: {
            first: 1,
          },
        },
        result: { data },
      },
    ];

    const render = jest.fn(() => null);

    const options = {
      variables: {
        first: 1,
      },
    };

    const Component = () => (
      <Query query={queryWithVariables} options={options}>
        {render}
      </Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={mocksWithVariable} removeTypename>
        <Component />
      </MockedProvider>,
    );

    setTimeout(() => {
      catchAsyncError(done, () => {
        expect(render.mock.calls[0][0].variables).toEqual({ first: 1 });
        done();
      });
    }, 0);
  });

  it('errors if a Mutation is provided in the query', () => {
    const mutation = gql`
      mutation submitRepository {
        submitRepository(repoFullName: "apollographql/apollo-client") {
          createdAt
        }
      }
    `;

    // Prevent error from being logged in console of test.
    const errorLogger = console.error;
    console.error = () => {};
    expect(() => {
      mount(
        <MockedProvider>
          <Query query={mutation}>{() => null} </Query>
        </MockedProvider>,
      );
    }).toThrowError(
      'The <Query /> component requires a graphql query, but got a mutation.',
    );

    console.error = errorLogger;
  });

  it('errors if a Subscription is provided in the query', () => {
    const subscription = gql`
      subscription onCommentAdded($repoFullName: String!) {
        commentAdded(repoFullName: $repoFullName) {
          id
          content
        }
      }
    `;

    // Prevent error from being logged in console of test.
    const errorLogger = console.error;
    console.error = () => {};
    expect(() => {
      mount(
        <MockedProvider>
          <Query query={subscription}>{() => null} </Query>
        </MockedProvider>,
      );
    }).toThrowError(
      'The <Query /> component requires a graphql query, but got a subscription.',
    );

    console.error = errorLogger;
  });

  it('provides a refetch render prop', done => {
    const queryRefetch = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

    const variables = {
      first: 1,
    };

    const mocks = [
      {
        request: { query: queryRefetch, variables },
        result: { data: data1 },
      },
      {
        request: { query: queryRefetch, variables },
        result: { data: data2 },
      },
      {
        request: { query: queryRefetch, variables: { first: 2 } },
        result: { data: data3 },
      },
    ];

    let count = 0;
    let hasRefetched = false;

    const options = {
      variables,
    };

    expect.assertions(8);

    const Component = () => (
      <Query query={queryRefetch} options={options}>
        {data => {
          if (data.loading) {
            count++;
            return null;
          }

          catchAsyncError(done, () => {
            if (count === 1) {
              // first data
              expect(data.variables).toEqual({ first: 1 });
              expect(data.data).toEqual(data1);
            }
            // TODO: Should this count be 3? Why is there is no loading state between first and second data?
            if (count === 2) {
              // second data
              expect(data.variables).toEqual({ first: 1 });
              expect(data.data).toEqual(data2);
            }
            if (count === 4) {
              // third data
              expect(data.variables).toEqual({ first: 2 });
              expect(data.data).toEqual(data3);
            }
          });

          count++;
          if (hasRefetched) {
            return null;
          }

          hasRefetched = true;
          data
            .refetch()
            .then(result => {
              expect(result.data).toEqual(data2);
              return data.refetch({ first: 2 });
            })
            .then(result2 => {
              expect(result2.data).toEqual(data3);
              done();
            })
            .catch(done.fail);

          return null;
        }}
      </Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('provides a fetchMore render prop', done => {
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };

    const variables = {
      first: 2,
    };

    const mocks = [
      {
        request: { query, variables: { first: 2 } },
        result: { data: data1 },
      },
      {
        request: { query, variables: { first: 1 } },
        result: { data: data2 },
      },
    ];

    let count = 0;
    expect.assertions(3);

    const Component = () => (
      <Query query={query} options={{ variables }}>
        {data => {
          if (data.loading) {
            return null;
          }
          if (count === 0) {
            data
              .fetchMore({
                variables: { first: 1 },
                updateQuery: (prev, { fetchMoreResult }) => ({
                  allPeople: {
                    people: [
                      ...prev.allPeople.people,
                      ...fetchMoreResult.allPeople.people,
                    ],
                  },
                }),
              })
              .then(result => {
                expect(result.data).toEqual(data2);
              })
              .catch(done.fail);
          } else if (count === 1) {
            catchAsyncError(done, () => {
              expect(data.variables).toEqual(variables);

              expect(data.data).toEqual({
                allPeople: {
                  people: [
                    ...data1.allPeople.people,
                    ...data2.allPeople.people,
                  ],
                },
              });
              done();
            });
          }

          count++;
          return null;
        }}
      </Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('sets polling interval using options', done => {
    expect.assertions(4);

    const options = {
      pollInterval: 30,
    };

    let count = 0;

    const Component = () => (
      <Query query={query} options={options}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (count === 0) {
            expect(result.data).toEqual(data1);
          } else if (count === 1) {
            expect(result.data).toEqual(data2);
          } else if (count === 2) {
            expect(result.data).toEqual(data3);
          }
          count++;
          return null;
        }}
      </Query>
    );

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

    const mocks = [
      {
        request: { query },
        result: { data: data1 },
      },
      {
        request: { query },
        result: { data: data2 },
      },
      {
        request: { query },
        result: { data: data3 },
      },
    ];

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );

    setTimeout(() => {
      catchAsyncError(done, () => {
        expect(count).toBe(3);
        wrapper.unmount();
        done();
      });
    }, 80);
  });

  it('provides startPolling in the render prop', done => {
    expect.assertions(4);

    let count = 0;
    let isPolling = false;
    const Component = () => (
      <Query query={query}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (!isPolling) {
            isPolling = true;
            result.startPolling(30);
          }
          catchAsyncError(done, () => {
            if (count === 0) {
              expect(result.data).toEqual(data1);
            } else if (count === 1) {
              expect(result.data).toEqual(data2);
            } else if (count === 2) {
              expect(result.data).toEqual(data3);
            }
          });

          count++;
          return null;
        }}
      </Query>
    );

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

    const mocks = [
      {
        request: { query },
        result: { data: data1 },
      },
      {
        request: { query },
        result: { data: data2 },
      },
      {
        request: { query },
        result: { data: data3 },
      },
    ];

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );

    setTimeout(() => {
      catchAsyncError(done, () => {
        expect(count).toBe(3);
        wrapper.unmount();
        done();
      });
    }, 80);
  });

  it('provides stopPolling in the render prop', done => {
    expect.assertions(3);

    const options = {
      pollInterval: 30,
    };

    let count = 0;

    const Component = () => (
      <Query query={query} options={options}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (count === 0) {
            expect(result.data).toEqual(data1);
          } else if (count === 1) {
            expect(result.data).toEqual(data2);
            result.stopPolling();
          }
          count++;
          return null;
        }}
      </Query>
    );

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

    const mocks = [
      {
        request: { query },
        result: { data: data1 },
      },
      {
        request: { query },
        result: { data: data2 },
      },
      {
        request: { query },
        result: { data: data3 },
      },
    ];

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );

    setTimeout(() => {
      catchAsyncError(done, () => {
        expect(count).toBe(2);
        wrapper.unmount();
        done();
      });
    }, 100);
  });

  it('provides updateQuery render prop', done => {
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const mocks = [
      {
        request: { query, variables },
        result: { data: data1 },
      },
    ];

    const variables = {
      first: 2,
    };
    let isUpdated;
    expect.assertions(3);
    const Component = () => (
      <Query query={query} options={{ variables }}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (isUpdated) {
            catchAsyncError(done, () => {
              expect(result.data).toEqual(data2);
              done();
            });

            return null;
          }
          isUpdated = true;
          setTimeout(() => {
            result.updateQuery((prev, { variables: variablesUpdate }) => {
              catchAsyncError(done, () => {
                expect(prev).toEqual(data1);
                expect(variablesUpdate).toEqual({ first: 2 });
              });

              return data2;
            });
          }, 0);

          return null;
        }}
      </Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('should update if the options change', done => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const mocks = [
      {
        request: { query, variables: { first: 1 } },
        result: { data: data1 },
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: data2 },
      },
    ];

    let count = 0;

    class Component extends React.Component {
      state = {
        variables: {
          first: 1,
        },
      };

      componentDidMount() {
        setTimeout(() => {
          this.setState({
            variables: {
              first: 2,
            },
          });
        }, 50);
      }

      render() {
        const { variables } = this.state;

        return (
          <Query query={query} options={{ variables }}>
            {result => {
              if (result.loading) {
                return null;
              }
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(result.variables).toEqual({ first: 1 });
                  expect(result.data).toEqual(data1);
                }
                if (count === 1) {
                  expect(result.variables).toEqual({ first: 2 });
                  expect(result.data).toEqual(data2);
                  done();
                }
              });

              count++;
              return null;
            }}
          </Query>
        );
      }
    }

    mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('should update if the query changes', done => {
    expect.assertions(2);
    const query1 = query;
    const query2 = gql`
      query people {
        allPeople(first: 1) {
          people {
            id
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo', id: '1' }] } };
    const mocks = [
      {
        request: { query: query1 },
        result: { data: data1 },
      },
      {
        request: { query: query2 },
        result: { data: data2 },
      },
    ];

    let count = 0;

    class Component extends React.Component {
      state = {
        query: query1,
      };

      componentDidMount() {
        setTimeout(() => {
          this.setState({
            query: query2,
          });
        }, 50);
      }

      render() {
        const { query } = this.state;

        return (
          <Query query={query}>
            {result => {
              if (result.loading) {
                return null;
              }
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(result.data).toEqual(data1);
                }
                if (count === 1) {
                  expect(result.data).toEqual(data2);
                  done();
                }
              });

              count++;
              return null;
            }}
          </Query>
        );
      }
    }

    mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('should error if the query changes type to a subscription', done => {
    const subscription = gql`
      subscription onCommentAdded($repoFullName: String!) {
        commentAdded(repoFullName: $repoFullName) {
          id
          content
        }
      }
    `;

    // Prevent error from showing up in console.
    const errorLog = console.error;
    console.error = () => {};

    class Component extends React.Component {
      state = { query };

      componentDidCatch(error) {
        catchAsyncError(done, () => {
          const error = new Error(
            'The <Query /> component requires a graphql query, but got a subscription.',
          );
          expect(error).toEqual(error);
          console.error = errorLog;

          done();
        });
      }

      componentDidMount() {
        setTimeout(() => {
          this.setState({
            query: subscription,
          });
        }, 0);
      }

      render() {
        const { query } = this.state;

        return (
          <Query query={query} loading={() => <div />}>
            {() => null}
          </Query>
        );
      }
    }

    mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('should update if the client changes in the context', done => {
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const link1 = mockSingleLink({
      request: { query },
      result: { data: data1 },
    });
    const client1 = new ApolloClient({
      link: link1,
      cache: new Cache({ addTypename: false }),
    });

    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const link2 = mockSingleLink({
      request: { query },
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
            <Query query={query}>
              {result => {
                if (result.loading) {
                  return null;
                }
                catchAsyncError(done, () => {
                  if (count === 0) {
                    expect(result.data).toEqual(data1);
                    setTimeout(() => {
                      this.setState({
                        client: client2,
                      });
                    }, 0);
                  }
                  if (count === 1) {
                    expect(result.data).toEqual(data2);
                    done();
                  }
                  count++;
                });

                return null;
              }}
            </Query>
          </ApolloProvider>
        );
      }
    }

    const wrapper = mount(
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>,
    );
  });
});
