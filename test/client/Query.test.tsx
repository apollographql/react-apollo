import * as React from 'react';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import { mount } from 'enzyme';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import ApolloProvider from '../../src/ApolloProvider';
import Query from '../../src/Query';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';
import catchAsyncError from '../test-utils/catchAsyncError';
import stripSymbols from '../test-utils/stripSymbols';

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

  it('calls the children prop', done => {
    const link = mockSingleLink({
      request: { query: allPeopleQuery },
      result: { data: allPeopleData },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Component = () => (
      <Query query={allPeopleQuery}>
        {result => {
          catchAsyncError(done, () => {
            const { client: clientResult, ...rest } = result;

            if (result.loading) {
              expect(rest).toMatchSnapshot(
                'result in render prop while loading',
              );
              expect(clientResult).toBe(client);
            } else {
              expect(rest).toMatchSnapshot('result in render prop');
              done();
            }
          });

          return null;
        }}
      </Query>
    );

    wrapper = mount(
      <ApolloProvider client={client}>
        <Component />
      </ApolloProvider>,
    );
  });

  it('renders using the children prop', done => {
    const Component = () => (
      <Query query={allPeopleQuery}>{result => <div />}</Query>
    );

    wrapper = mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
    catchAsyncError(done, () => {
      expect(wrapper.find('div').exists()).toBeTruthy();
      done();
    });
  });

  describe('result provides', () => {
    it('client', done => {
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
            variables: {
              first: 1,
            },
          },
          result: { data: allPeopleData },
        },
      ];

      const variables = {
        first: 1,
      };

      const Component = () => (
        <Query query={queryWithVariables} variables={variables}>
          {result => {
            catchAsyncError(done, () => {
              expect(result.client).toBeInstanceOf(ApolloClient);
              done();
            });
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocksWithVariable} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('error', done => {
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

      wrapper = mount(
        <MockedProvider mocks={mockError} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('refetch', done => {
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

      expect.assertions(5);

      const Component = () => (
        <Query
          query={queryRefetch}
          variables={refetchVariables}
          notifyOnNetworkStatusChange
        >
          {result => {
            const { data, loading } = result;
            if (loading) {
              count++;
              return null;
            }

            catchAsyncError(done, () => {
              if (count === 1) {
                // first data
                expect(stripSymbols(data)).toEqual(data1);
              }
              if (count === 3) {
                // second data
                expect(stripSymbols(data)).toEqual(data2);
              }
              if (count === 5) {
                // third data
                expect(stripSymbols(data)).toEqual(data3);
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
                  expect(stripSymbols(result1.data)).toEqual(data2);
                  return result.refetch({ first: 2 });
                })
                .then(result2 => {
                  expect(stripSymbols(result2.data)).toEqual(data3);
                  done();
                })
                .catch(done.fail);
            });

            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('fetchMore', done => {
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
      expect.assertions(2);

      const Component = () => (
        <Query query={allPeopleQuery} variables={variables}>
          {result => {
            if (result.loading) {
              return null;
            }
            if (count === 0) {
              result
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
                .then(result2 => {
                  expect(stripSymbols(result2.data)).toEqual(data2);
                })
                .catch(done.fail);
            } else if (count === 1) {
              catchAsyncError(done, () => {
                expect(stripSymbols(result.data)).toEqual({
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

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('startPolling', done => {
      jest.useFakeTimers();
      expect.assertions(4);

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
                expect(stripSymbols(result.data)).toEqual(data1);
              } else if (count === 1) {
                expect(stripSymbols(result.data)).toEqual(data2);
              } else if (count === 2) {
                expect(stripSymbols(result.data)).toEqual(data3);
              }
            });

            count++;
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );

      jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

      catchAsyncError(done, () => {
        expect(count).toBe(POLL_COUNT);
        done();
      });
    });

    it('stopPolling', done => {
      jest.useFakeTimers();
      expect.assertions(3);

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
              expect(stripSymbols(result.data)).toEqual(data1);
            } else if (count === 1) {
              expect(stripSymbols(result.data)).toEqual(data2);
              result.stopPolling();
            }
            count++;
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );

      jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

      catchAsyncError(done, () => {
        expect(count).toBe(POLL_COUNT);
        done();
      });
    });

    it('updateQuery', done => {
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
                expect(stripSymbols(result.data)).toEqual(data2);

                done();
              });

              return null;
            }
            isUpdated = true;
            setTimeout(() => {
              result.updateQuery((prev, { variables: variablesUpdate }) => {
                catchAsyncError(done, () => {
                  expect(stripSymbols(prev)).toEqual(data1);
                  expect(variablesUpdate).toEqual({ first: 2 });
                });

                return data2;
              });
            }, 0);

            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });
  });

  describe('props allow', () => {
    it('custom fetch-policy', done => {
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

      wrapper = mount(
        <MockedProvider mocks={allPeopleMocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('notifyOnNetworkStatusChange', done => {
      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data1 },
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data2 },
        },
      ];

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

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('pollInterval', done => {
      jest.useFakeTimers();
      expect.assertions(4);

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
              expect(stripSymbols(result.data)).toEqual(data1);
            } else if (count === 1) {
              expect(stripSymbols(result.data)).toEqual(data2);
            } else if (count === 2) {
              expect(stripSymbols(result.data)).toEqual(data3);
            }
            count++;
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );

      jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

      catchAsyncError(done, () => {
        expect(count).toBe(POLL_COUNT);
        done();
      });
    });
  });

  describe('props disallow', () => {
    it('Mutation provided as query', () => {
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

    it('Subscription provided as query', () => {
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
  });

  describe('should update', () => {
    it('if props change', done => {
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
                    expect(variables).toEqual({ first: 1 });
                    expect(stripSymbols(result.data)).toEqual(data1);
                  }
                  if (count === 1) {
                    expect(variables).toEqual({ first: 2 });
                    expect(stripSymbols(result.data)).toEqual(data2);
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

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('if the query changes', done => {
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
                    expect(stripSymbols(result.data)).toEqual(data1);
                    setTimeout(() => {
                      this.setState({
                        query: query2,
                      });
                    });
                  }
                  if (count === 1) {
                    expect(stripSymbols(result.data)).toEqual(data2);
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

      wrapper = mount(
        <MockedProvider mocks={mocks} removeTypename>
          <Component />
        </MockedProvider>,
      );
    });

    it('if the client changes in the context', done => {
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
                      expect(stripSymbols(result.data)).toEqual(data1);
                      setTimeout(() => {
                        this.setState({
                          client: client2,
                        });
                      }, 0);
                    }
                    if (count === 1) {
                      expect(stripSymbols(result.data)).toEqual(data2);
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

      wrapper = mount(<Component />);
    });
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

    wrapper = mount(
      <MockedProvider mocks={allPeopleMocks} removeTypename>
        <Component />
      </MockedProvider>,
    );
  });
});
