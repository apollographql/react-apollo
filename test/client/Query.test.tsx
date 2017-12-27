import * as React from 'react';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import { mount } from 'enzyme';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import ApolloProvider from '../../src/ApolloProvider';
import Query from '../../src/Query';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';
import catchAsyncError from '../test-utils/catchAsyncError';

const allPeopleQuery = gql`
  query people {
    allPeople(first: 1) {
      people {
        name
      }
    }
  }
`;
const allPeopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
const allPeopleMocks = [
  {
    request: { query: allPeopleQuery },
    result: { data: allPeopleData },
  },
];

describe('Query component', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('calls the children prop', done => {
    const Component = () => (
      <Query query={allPeopleQuery}>
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

    mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('renders using the children prop', done => {
    const Component = () => (
      <Query query={allPeopleQuery}>{result => <div />}</Query>
    );

    const wrapper = mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
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
        request: { query: allPeopleQuery },
        error: new Error('error occurred'),
      },
    ];

    const Component = () => (
      <Query query={allPeopleQuery}>
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

    mount(
      <MockedProvider mocks={mockError} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('makes use of a custom fetch-policy', done => {
    const Component = () => (
      <Query query={allPeopleQuery} fetchPolicy={'cache-only'}>
        {result => {
          catchAsyncError(done, () => {
            expect(result.loading).toBeFalsy();
            expect(result.data).toEqual({});
            expect(result.networkStatus).toBe(7);
            done();
          });
          return null;
        }}
      </Query>
    );

    mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('sets the notifyOnNetworkStatusChange prop', done => {
    let count = 0;
    expect.assertions(4);
    const Component = () => (
      <Query query={allPeopleQuery} notifyOnNetworkStatusChange>
        {result => {
          catchAsyncError(done, () => {
            if (count === 0) {
              expect(result.loading).toBeTruthy();
            }
            if (count === 1) {
              expect(result.loading).toBeFalsy();
              setTimeout(() => {
                result.refetch();
              });
            }
            if (count === 2) {
              expect(result.loading).toBeTruthy();
            }
            if (count === 3) {
              expect(result.loading).toBeFalsy();
              done();
            }

            count++;
          });
          return null;
        }}
      </Query>
    );

    mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
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
        result: { data: allPeopleData },
      },
    ];

    const render = jest.fn(() => null);

    const variables = {
      first: 1,
    };

    const Component = () => (
      <Query query={queryWithVariables} variables={variables}>
        {render}
      </Query>
    );

    mount(
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
    console.error = () => {}; // tslint:disable-line
    expect(() => {
      mount(
        <MockedProvider>
          <Query query={mutation}>{() => null}</Query>
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
    console.error = () => {}; // tslint:disable-line
    expect(() => {
      mount(
        <MockedProvider>
          <Query query={subscription}>{() => null}</Query>
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

    const refetchVariables = {
      first: 1,
    };

    const mocks = [
      {
        request: { query: queryRefetch, variables: refetchVariables },
        result: { data: data1 },
      },
      {
        request: { query: queryRefetch, variables: refetchVariables },
        result: { data: data2 },
      },
      {
        request: { query: queryRefetch, variables: { first: 2 } },
        result: { data: data3 },
      },
    ];

    let count = 0;
    let hasRefetched = false;

    expect.assertions(8);

    const Component = () => (
      <Query
        query={queryRefetch}
        variables={refetchVariables}
        notifyOnNetworkStatusChange
      >
        {result => {
          const { data, loading, variables } = result;
          if (loading) {
            count++;
            return null;
          }
          catchAsyncError(done, () => {
            if (count === 1) {
              // first data
              expect(variables).toEqual({ first: 1 });
              expect(data).toMatchSnapshot('refetch prop: first render data');
            }
            if (count === 3) {
              // second data
              expect(variables).toEqual({ first: 1 });
              expect(data).toMatchSnapshot('refetch prop: second render data');
            }
            if (count === 5) {
              // third data
              expect(variables).toEqual({ first: 2 });
              expect(data).toMatchSnapshot('refetch prop: third render data');
            }
          });

          count++;
          if (hasRefetched) {
            return null;
          }

          hasRefetched = true;
          setTimeout(() => {
            result
              .refetch()
              .then(result1 => {
                expect(result1.data).toMatchSnapshot(
                  'refetch prop: result refetch call 1',
                );
                return result.refetch({ first: 2 });
              })
              .then(result2 => {
                expect(result2.data).toMatchSnapshot(
                  'refetch prop: result refetch call 2',
                );
                done();
              })
              .catch(done.fail);
          });

          return null;
        }}
      </Query>
    );

    mount(
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
        request: { query: allPeopleQuery, variables: { first: 2 } },
        result: { data: data1 },
      },
      {
        request: { query: allPeopleQuery, variables: { first: 1 } },
        result: { data: data2 },
      },
    ];

    let count = 0;
    expect.assertions(3);

    const Component = () => (
      <Query query={allPeopleQuery} variables={variables}>
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
                expect(result.data).toMatchSnapshot(
                  'fetchMore render prop: result fetchMore call',
                );
              })
              .catch(done.fail);
          } else if (count === 1) {
            catchAsyncError(done, () => {
              expect(data.variables).toEqual(variables);
              expect(data.data).toMatchSnapshot(
                'fetchMore render prop: render data',
              );

              done();
            });
          }

          count++;
          return null;
        }}
      </Query>
    );

    mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('sets polling interval using options', done => {
    jest.useFakeTimers();
    expect.assertions(4);

    let count = 0;
    const POLL_COUNT = 3;
    const POLL_INTERVAL = 30;

    const Component = () => (
      <Query query={allPeopleQuery} pollInterval={POLL_INTERVAL}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (count === 0) {
            expect(result.data).toMatchSnapshot();
          } else if (count === 1) {
            expect(result.data).toMatchSnapshot();
          } else if (count === 2) {
            expect(result.data).toMatchSnapshot();
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
        request: { query: allPeopleQuery },
        result: { data: data1 },
      },
      {
        request: { query: allPeopleQuery },
        result: { data: data2 },
      },
      {
        request: { query: allPeopleQuery },
        result: { data: data3 },
      },
    ];

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );

    jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

    catchAsyncError(done, () => {
      expect(count).toBe(POLL_COUNT);
      wrapper.unmount();
      done();
    });
  });

  it('provides startPolling in the render prop', done => {
    jest.useFakeTimers();
    expect.assertions(4);

    let count = 0;
    let isPolling = false;

    const POLL_INTERVAL = 30;
    const POLL_COUNT = 3;

    const Component = () => (
      <Query query={allPeopleQuery}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (!isPolling) {
            isPolling = true;
            result.startPolling(POLL_INTERVAL);
          }
          catchAsyncError(done, () => {
            if (count === 0) {
              expect(result.data).toMatchSnapshot();
            } else if (count === 1) {
              expect(result.data).toMatchSnapshot();
            } else if (count === 2) {
              expect(result.data).toMatchSnapshot();
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
        request: { query: allPeopleQuery },
        result: { data: data1 },
      },
      {
        request: { query: allPeopleQuery },
        result: { data: data2 },
      },
      {
        request: { query: allPeopleQuery },
        result: { data: data3 },
      },
    ];

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );

    jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

    catchAsyncError(done, () => {
      expect(count).toBe(POLL_COUNT);
      wrapper.unmount();
      done();
    });
  });

  it('provides stopPolling in the render prop', done => {
    jest.useFakeTimers();
    expect.assertions(3);

    const POLL_COUNT = 2;
    const POLL_INTERVAL = 30;
    let count = 0;

    const Component = () => (
      <Query query={allPeopleQuery} pollInterval={POLL_INTERVAL}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (count === 0) {
            expect(result.data).toMatchSnapshot();
          } else if (count === 1) {
            expect(result.data).toMatchSnapshot();
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
        request: { query: allPeopleQuery },
        result: { data: data1 },
      },
      {
        request: { query: allPeopleQuery },
        result: { data: data2 },
      },
      {
        request: { query: allPeopleQuery },
        result: { data: data3 },
      },
    ];

    const wrapper = mount(
      <MockedProvider mocks={mocks} removeTypename>
        <Component />
      </MockedProvider>,
    );

    jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

    catchAsyncError(done, () => {
      expect(count).toBe(POLL_COUNT);
      wrapper.unmount();
      done();
    });
  });

  it('provides updateQuery render prop', done => {
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const variables = {
      first: 2,
    };
    const mocks = [
      {
        request: { query: allPeopleQuery, variables },
        result: { data: data1 },
      },
    ];

    let isUpdated;
    expect.assertions(3);
    const Component = () => (
      <Query query={allPeopleQuery} variables={variables}>
        {result => {
          if (result.loading) {
            return null;
          }
          if (isUpdated) {
            catchAsyncError(done, () => {
              expect(result.data).toMatchSnapshot(
                'updateQuery render prop: rendered data',
              );
              done();
            });

            return null;
          }
          isUpdated = true;
          setTimeout(() => {
            result.updateQuery((prev, { variables: variablesUpdate }) => {
              catchAsyncError(done, () => {
                expect(prev).toMatchSnapshot(
                  'updateQuery render prop: result of the updateQuery call',
                );
                expect(variablesUpdate).toEqual({ first: 2 });
              });

              return data2;
            });
          }, 0);

          return null;
        }}
      </Query>
    );

    mount(
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
          <Query query={query} variables={variables}>
            {result => {
              if (result.loading) {
                return null;
              }
              catchAsyncError(done, () => {
                if (count === 0) {
                  expect(result.variables).toEqual({ first: 1 });
                  expect(result.data).toMatchSnapshot();
                }
                if (count === 1) {
                  expect(result.variables).toEqual({ first: 2 });
                  expect(result.data).toMatchSnapshot();
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
    const query1 = allPeopleQuery;
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
                  expect(result.data).toMatchSnapshot();
                  setTimeout(() => {
                    this.setState({
                      query: query2,
                    });
                  });
                }
                if (count === 1) {
                  expect(result.data).toMatchSnapshot();
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
    console.error = () => {}; // tslint:disable-line

    class Component extends React.Component {
      state = { query: allPeopleQuery };

      componentDidCatch(error) {
        catchAsyncError(done, () => {
          const expectedError = new Error(
            'The <Query /> component requires a graphql query, but got a subscription.',
          );
          expect(error).toEqual(expectedError);
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
        return <Query query={query}>{() => null}</Query>;
      }
    }

    mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });

  it('should update if the client changes in the context', done => {
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const link1 = mockSingleLink({
      request: { query: allPeopleQuery },
      result: { data: data1 },
    });
    const client1 = new ApolloClient({
      link: link1,
      cache: new Cache({ addTypename: false }),
    });

    const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
    const link2 = mockSingleLink({
      request: { query: allPeopleQuery },
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
            <Query query={allPeopleQuery}>
              {result => {
                if (result.loading) {
                  return null;
                }
                catchAsyncError(done, () => {
                  if (count === 0) {
                    expect(result.data).toMatchSnapshot();
                    setTimeout(() => {
                      this.setState({
                        client: client2,
                      });
                    }, 0);
                  }
                  if (count === 1) {
                    expect(result.data).toMatchSnapshot();
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

    mount(<Component />);
  });
});
