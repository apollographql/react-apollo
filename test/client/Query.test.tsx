import * as React from 'react';
import ApolloClient, { NetworkStatus } from 'apollo-client';
import { mount, ReactWrapper } from 'enzyme';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider, Query } from '../../src';
import { MockedProvider, mockSingleLink } from '../../src/test-utils';
import catchAsyncError from '../test-utils/catchAsyncError';
import stripSymbols from '../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';

const allPeopleQuery: DocumentNode = gql`
  query people {
    allPeople(first: 1) {
      people {
        name
      }
    }
  }
`;

interface Data {
  allPeople: {
    people: Array<{ name: string }>;
  };
}

const allPeopleData: Data = {
  allPeople: { people: [{ name: 'Luke Skywalker' }] },
};
const allPeopleMocks = [
  {
    request: { query: allPeopleQuery },
    result: { data: allPeopleData },
  },
];

class AllPeopleQuery extends Query<Data, { first: number }> {}

describe('Query component', () => {
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
              expect(rest).toMatchSnapshot('result in render prop while loading');
              expect(clientResult).toBe(client);
            } else {
              expect(stripSymbols(rest)).toMatchSnapshot('result in render prop');
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
    const Component = () => <Query query={allPeopleQuery}>{_ => <div />}</Query>;

    wrapper = mount(
      <MockedProvider mocks={allPeopleMocks}>
        <Component />
      </MockedProvider>,
    );
    catchAsyncError(done, () => {
      expect(wrapper!.find('div').exists()).toBeTruthy();
      done();
    });
  });

  describe('result provides', () => {
    it('client', done => {
      const queryWithVariables: DocumentNode = gql`
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
        <MockedProvider mocks={mocksWithVariable}>
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
              expect(result.error).toEqual(new Error('Network error: error occurred'));
              done();
            });
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mockError}>
          <Component />
        </MockedProvider>,
      );
    });

    it('refetch', done => {
      const queryRefetch: DocumentNode = gql`
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
        <AllPeopleQuery
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
        </AllPeopleQuery>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} addTypename={false}>
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
        <AllPeopleQuery query={allPeopleQuery} variables={variables}>
          {result => {
            if (result.loading) {
              return null;
            }
            if (count === 0) {
              result
                .fetchMore({
                  variables: { first: 1 },
                  updateQuery: (prev, { fetchMoreResult }) =>
                    fetchMoreResult
                      ? {
                          allPeople: {
                            people: [...prev.allPeople.people, ...fetchMoreResult.allPeople.people],
                          },
                        }
                      : prev,
                })
                .then(result2 => {
                  expect(stripSymbols(result2.data)).toEqual(data2);
                })
                .catch(done.fail);
            } else if (count === 1) {
              catchAsyncError(done, () => {
                expect(stripSymbols(result.data)).toEqual({
                  allPeople: {
                    people: [...data1.allPeople.people, ...data2.allPeople.people],
                  },
                });

                done();
              });
            }

            count++;
            return null;
          }}
        </AllPeopleQuery>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} addTypename={false}>
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
        <MockedProvider mocks={mocks} addTypename={false}>
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
        <MockedProvider mocks={mocks} addTypename={false}>
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

      let isUpdated = false;
      expect.assertions(3);

      const Component = () => (
        <AllPeopleQuery query={allPeopleQuery} variables={variables}>
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
        </AllPeopleQuery>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} addTypename={false}>
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
              expect(result.networkStatus).toBe(NetworkStatus.ready);
              done();
            });
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={allPeopleMocks}>
          <Component />
        </MockedProvider>,
      );
    });

    it('default fetch-policy', done => {
      const Component = () => (
        <Query query={allPeopleQuery}>
          {result => {
            catchAsyncError(done, () => {
              expect(result.loading).toBeFalsy();
              expect(result.networkStatus).toBe(NetworkStatus.ready);
              done();
            });
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider
          defaultOptions={{ watchQuery: { fetchPolicy: 'cache-only' } }}
          mocks={allPeopleMocks}
        >
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
        <MockedProvider mocks={mocks} addTypename={false}>
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
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>,
      );

      jest.runTimersToTime(POLL_INTERVAL * POLL_COUNT);

      catchAsyncError(done, () => {
        expect(count).toBe(POLL_COUNT);
        done();
      });
    });

    it('onCompleted with data', done => {
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data },
        },
      ];

      const onCompleted = (queryData: Data) => {
        expect(stripSymbols(queryData)).toEqual(data);
        done();
      };

      const Component = () => (
        <Query query={allPeopleQuery} onCompleted={onCompleted}>
          {() => {
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>,
      );
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
      }).toThrowError('The <Query /> component requires a graphql query, but got a mutation.');

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
      }).toThrowError('The <Query /> component requires a graphql query, but got a subscription.');

      console.error = errorLogger;
    });

    it('onCompleted with error', done => {
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

      const mockError = [
        {
          request: { query: allPeopleQuery },
          error: new Error('error occurred'),
        },
      ];

      const onCompleted = jest.fn();

      const Component = () => (
        <Query query={allPeopleQuery} onCompleted={onCompleted}>
          {({ error }) => {
            if (error) {
              expect(onCompleted).not.toHaveBeenCalled();
              done();
            }
            return null;
          }}
        </Query>
      );

      wrapper = mount(
        <MockedProvider mocks={mockError} addTypename={false}>
          <Component />
        </MockedProvider>,
      );
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
            <AllPeopleQuery query={query} variables={variables}>
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
            </AllPeopleQuery>
          );
        }
      }

      wrapper = mount(
        <MockedProvider mocks={mocks} addTypename={false}>
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
                if (result.loading) return null;
                catchAsyncError(done, () => {
                  if (count === 0) {
                    expect(stripSymbols(result.data)).toEqual(data1);
                    setTimeout(() => {
                      this.setState({ query: query2 });
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
        <MockedProvider mocks={mocks} addTypename={false}>
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

    it('with data while loading', done => {
      const query = gql`
        query people($first: Int) {
          allPeople(first: $first) {
            people {
              name
            }
          }
        }
      `;

      const data1 = {
        allPeople: {
          people: [{ name: 'Luke Skywalker' }],
        },
      };
      const data2 = {
        allPeople: { people: [{ name: 'Han Solo' }] },
      };
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
            <AllPeopleQuery query={query} variables={variables}>
              {result => {
                catchAsyncError(done, () => {
                  if (result.loading && count === 2) {
                    expect(stripSymbols(result.data)).toEqual(data1);
                    done();
                  }

                  return null;
                });

                count++;
                return null;
              }}
            </AllPeopleQuery>
          );
        }
      }

      wrapper = mount(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>,
      );
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

      componentDidCatch(error: any) {
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
      <MockedProvider mocks={allPeopleMocks} addTypename={false}>
        <Component />
      </MockedProvider>,
    );
  });

  it('should be able to refetch after there was a network error', done => {
    const query: DocumentNode = gql`
      query somethingelse {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;

    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const dataTwo = { allPeople: { people: [{ name: 'Princess Leia' }] } };
    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, error: new Error('This is an error!') },
      { request: { query }, result: { data: dataTwo } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    const noop = () => null;

    class AllPeopleQuery2 extends Query<Data> {}

    function Container() {
      return (
        <AllPeopleQuery2 query={query} notifyOnNetworkStatusChange>
          {result => {
            try {
              switch (count++) {
                case 0:
                  // Waiting for the first result to load
                  expect(result.loading).toBeTruthy();
                  break;
                case 1:
                  if (!result.data!.allPeople) {
                    done.fail('Should have data by this point');
                    break;
                  }
                  // First result is loaded, run a refetch to get the second result
                  // which is an error.
                  expect(stripSymbols(result.data!.allPeople)).toEqual(data.allPeople);
                  setTimeout(() => {
                    result.refetch().then(() => {
                      done.fail('Expected error value on first refetch.');
                    }, noop);
                  }, 0);
                  break;
                case 2:
                  // Waiting for the second result to load
                  expect(result.loading).toBeTruthy();
                  break;
                case 3:
                  // The error arrived, run a refetch to get the third result
                  // which should now contain valid data.
                  expect(result.loading).toBeFalsy();
                  expect(result.error).toBeTruthy();
                  setTimeout(() => {
                    result.refetch().catch(() => {
                      done.fail('Expected good data on second refetch.');
                    });
                  }, 0);
                  break;
                // Further fix required in QueryManager, we should have an extra
                // step for the loading status of the third result
                // case 4:
                //   expect(result.loading).toBeTruthy();
                //   expect(result.error).toBeFalsy();
                //   break;
                case 4:
                  // Third result's data is loaded
                  expect(result.loading).toBeFalsy();
                  expect(result.error).toBeFalsy();
                  if (!result.data) {
                    done.fail('Should have data by this point');
                    break;
                  }
                  expect(stripSymbols(result.data.allPeople)).toEqual(dataTwo.allPeople);
                  done();
                  break;
                default:
                  throw new Error('Unexpected fall through');
              }
            } catch (e) {
              done.fail(e);
            }
            return null;
          }}
        </AllPeopleQuery2>
      );
    }

    wrapper = mount(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
