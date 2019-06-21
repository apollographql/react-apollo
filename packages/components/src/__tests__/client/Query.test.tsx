import React from 'react';
import ApolloClient, { ApolloError, NetworkStatus } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider } from '@apollo/react-common';
import {
  MockedProvider,
  mockSingleLink,
  stripSymbols
} from '@apollo/react-testing';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { render, cleanup } from '@testing-library/react';
import { ApolloLink } from 'apollo-link';
import { Query } from '@apollo/react-components';

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
  allPeople: { people: [{ name: 'Luke Skywalker' }] }
};
const allPeopleMocks = [
  {
    request: { query: allPeopleQuery },
    result: { data: allPeopleData }
  }
];

const AllPeopleQuery = Query;

describe('Query component', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  afterEach(cleanup);

  it('calls the children prop', done => {
    const link = mockSingleLink({
      request: { query: allPeopleQuery },
      result: { data: allPeopleData }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    const Component = () => (
      <Query query={allPeopleQuery}>
        {(result: any) => {
          try {
            const { client: clientResult, ...rest } = result;

            if (result.loading) {
              expect(rest).toMatchSnapshot(
                'result in render prop while loading'
              );
              expect(clientResult).toBe(client);
            } else {
              expect(stripSymbols(rest)).toMatchSnapshot(
                'result in render prop'
              );
              done();
            }
          } catch (error) {
            done.fail(error);
          }

          return null;
        }}
      </Query>
    );

    render(
      <ApolloProvider client={client}>
        <Component />
      </ApolloProvider>
    );
  });

  it('renders using the children prop', done => {
    const Component = () => (
      <Query query={allPeopleQuery}>{(_: any) => <div>test</div>}</Query>
    );

    const { getByText } = render(
      <MockedProvider mocks={allPeopleMocks}>
        <Component />
      </MockedProvider>
    );
    try {
      expect(getByText('test')).toBeTruthy();
      done();
    } catch (error) {
      done.fail(error);
    }
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
              first: 1
            }
          },
          result: { data: allPeopleData }
        }
      ];

      const variables = {
        first: 1
      };

      const Component = () => (
        <Query query={queryWithVariables} variables={variables}>
          {({ client }: any) => {
            try {
              expect(client).not.toBeFalsy();
              expect(client.version).not.toBeFalsy();
              done();
            } catch (error) {
              done.fail(error);
            }
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mocksWithVariable}>
          <Component />
        </MockedProvider>
      );
    });

    it('error', done => {
      const mockError = [
        {
          request: { query: allPeopleQuery },
          error: new Error('error occurred')
        }
      ];

      const Component = () => (
        <Query query={allPeopleQuery}>
          {(result: any) => {
            if (result.loading) {
              return null;
            }
            try {
              expect(result.error).toEqual(
                new Error('Network error: error occurred')
              );
              done();
            } catch (error) {
              done.fail(error);
            }
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mockError}>
          <Component />
        </MockedProvider>
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
        first: 1
      };

      const mocks = [
        {
          request: { query: queryRefetch, variables: refetchVariables },
          result: { data: data1 }
        },
        {
          request: { query: queryRefetch, variables: refetchVariables },
          result: { data: data2 }
        },
        {
          request: { query: queryRefetch, variables: { first: 2 } },
          result: { data: data3 }
        }
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
          {(result: any) => {
            const { data, loading } = result;
            if (loading) {
              count++;
              return null;
            }

            try {
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
            } catch (error) {
              done.fail(error);
            }

            count++;
            if (hasRefetched) {
              return null;
            }

            hasRefetched = true;
            setTimeout(() => {
              result
                .refetch()
                .then((result1: any) => {
                  expect(stripSymbols(result1.data)).toEqual(data2);
                  return result.refetch({ first: 2 });
                })
                .then((result2: any) => {
                  expect(stripSymbols(result2.data)).toEqual(data3);
                  done();
                })
                .catch(done.fail);
            });

            return null;
          }}
        </AllPeopleQuery>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('fetchMore', done => {
      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };

      const variables = {
        first: 2
      };

      const mocks = [
        {
          request: { query: allPeopleQuery, variables: { first: 2 } },
          result: { data: data1 }
        },
        {
          request: { query: allPeopleQuery, variables: { first: 1 } },
          result: { data: data2 }
        }
      ];

      let count = 0;
      expect.assertions(2);

      const Component = () => (
        <AllPeopleQuery query={allPeopleQuery} variables={variables}>
          {(result: any) => {
            if (result.loading) {
              return null;
            }
            if (count === 0) {
              result
                .fetchMore({
                  variables: { first: 1 },
                  updateQuery: (prev: any, { fetchMoreResult }: any) =>
                    fetchMoreResult
                      ? {
                          allPeople: {
                            people: [
                              ...prev.allPeople.people,
                              ...fetchMoreResult.allPeople.people
                            ]
                          }
                        }
                      : prev
                })
                .then((result2: any) => {
                  expect(stripSymbols(result2.data)).toEqual(data2);
                })
                .catch(done.fail);
            } else if (count === 1) {
              try {
                expect(stripSymbols(result.data)).toEqual({
                  allPeople: {
                    people: [
                      ...data1.allPeople.people,
                      ...data2.allPeople.people
                    ]
                  }
                });

                done();
              } catch (error) {
                done.fail(error);
              }
            }

            count++;
            return null;
          }}
        </AllPeopleQuery>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('startPolling', done => {
      expect.assertions(3);

      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
      const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data1 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data2 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data3 }
        }
      ];

      let count = 0;
      let isPolling = false;

      const POLL_INTERVAL = 5;

      const Component = () => (
        <Query query={allPeopleQuery}>
          {(result: any) => {
            if (result.loading) {
              return null;
            }
            if (!isPolling) {
              isPolling = true;
              result.startPolling(POLL_INTERVAL);
            }

            try {
              if (count === 0) {
                expect(stripSymbols(result.data)).toEqual(data1);
              } else if (count === 1) {
                expect(stripSymbols(result.data)).toEqual(data2);
              } else if (count === 2) {
                expect(stripSymbols(result.data)).toEqual(data3);
              } else if (count === 3) {
                done();
              }
            } catch (error) {
              done.fail(error);
            }

            count++;
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('stopPolling', done => {
      expect.assertions(3);

      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
      const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data1 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data2 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data3 }
        }
      ];

      const POLL_COUNT = 2;
      const POLL_INTERVAL = 5;
      let count = 0;

      const Component = () => (
        <Query query={allPeopleQuery} pollInterval={POLL_INTERVAL}>
          {(result: any) => {
            if (result.loading) {
              return null;
            }
            if (count === 0) {
              expect(stripSymbols(result.data)).toEqual(data1);
            } else if (count === 1) {
              expect(stripSymbols(result.data)).toEqual(data2);
              result.stopPolling();
              setTimeout(() => {
                expect(count).toBe(POLL_COUNT);
                done();
              }, 10);
            }
            count++;
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('updateQuery', done => {
      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
      const variables = {
        first: 2
      };
      const mocks = [
        {
          request: { query: allPeopleQuery, variables },
          result: { data: data1 }
        }
      ];

      let isUpdated = false;
      expect.assertions(3);

      const Component = () => (
        <AllPeopleQuery query={allPeopleQuery} variables={variables}>
          {(result: any) => {
            if (result.loading) {
              return null;
            }
            if (isUpdated) {
              try {
                expect(stripSymbols(result.data)).toEqual(data2);

                done();
              } catch (error) {
                done.fail(error);
              }

              return null;
            }
            isUpdated = true;
            setTimeout(() => {
              result.updateQuery(
                (prev: any, { variables: variablesUpdate }: any) => {
                  try {
                    expect(stripSymbols(prev)).toEqual(data1);
                    expect(variablesUpdate).toEqual({ first: 2 });
                  } catch (error) {
                    done.fail(error);
                  }

                  return data2;
                }
              );
            }, 0);

            return null;
          }}
        </AllPeopleQuery>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });
  });

  describe('props allow', () => {
    it('custom fetch-policy', done => {
      let count = 0;
      const Component = () => (
        <Query query={allPeopleQuery} fetchPolicy={'cache-only'}>
          {(result: any) => {
            if (count === 0) {
              try {
                expect(result.loading).toBeFalsy();
                expect(result.networkStatus).toBe(NetworkStatus.ready);
                done();
              } catch (error) {
                done.fail(error);
              }
            }
            count += 1;
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={allPeopleMocks}>
          <Component />
        </MockedProvider>
      );
    });

    it('default fetch-policy', done => {
      let count = 0;
      const Component = () => (
        <Query query={allPeopleQuery}>
          {(result: any) => {
            if (count === 0) {
              try {
                expect(result.loading).toBeFalsy();
                expect(result.networkStatus).toBe(NetworkStatus.ready);
                done();
              } catch (error) {
                done.fail(error);
              }
            }
            count += 1;
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider
          defaultOptions={{ watchQuery: { fetchPolicy: 'cache-only' } }}
          mocks={allPeopleMocks}
        >
          <Component />
        </MockedProvider>
      );
    });

    it('notifyOnNetworkStatusChange', done => {
      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data1 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data2 }
        }
      ];

      let count = 0;
      expect.assertions(4);
      const Component = () => (
        <Query query={allPeopleQuery} notifyOnNetworkStatusChange>
          {(result: any) => {
            try {
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
            } catch (error) {
              done.fail(error);
            }
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('pollInterval', done => {
      expect.assertions(4);

      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Han Solo' }] } };
      const data3 = { allPeople: { people: [{ name: 'Darth Vader' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data1 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data2 }
        },
        {
          request: { query: allPeopleQuery },
          result: { data: data3 }
        }
      ];

      let count = 0;
      const POLL_COUNT = 3;
      const POLL_INTERVAL = 30;

      const Component = () => (
        <Query query={allPeopleQuery} pollInterval={POLL_INTERVAL}>
          {(result: any) => {
            if (result.loading) {
              return null;
            }
            if (count === 0) {
              expect(stripSymbols(result.data)).toEqual(data1);
            } else if (count === 1) {
              expect(stripSymbols(result.data)).toEqual(data2);
            } else if (count === 2) {
              expect(stripSymbols(result.data)).toEqual(data3);
            } else {
              expect(count).toBe(POLL_COUNT);
              done();
            }
            count++;
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('skip', done => {
      const Component = () => (
        <Query query={allPeopleQuery} skip>
          {(result: any) => {
            try {
              expect(result.loading).toBeFalsy();
              expect(result.data).toBe(undefined);
              expect(result.error).toBe(undefined);
              done();
            } catch (error) {
              done.fail(error);
            }
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={allPeopleMocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('onCompleted with data', done => {
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
          result: { data: data1 }
        },
        {
          request: { query, variables: { first: 2 } },
          result: { data: data2 }
        }
      ];

      let count = 0;

      class Component extends React.Component {
        state = {
          variables: {
            first: 1
          }
        };

        componentDidMount() {
          setTimeout(() => {
            this.setState({
              variables: {
                first: 2
              }
            });
            setTimeout(() => {
              this.setState({
                variables: {
                  first: 1
                }
              });
            }, 0);
          }, 0);
        }

        // Make sure `onCompleted` is called both when new data is being
        // fetched over the network, and when data is coming back from
        // the cache.
        onCompleted(data: Data | {}) {
          if (count === 0) {
            expect(stripSymbols(data)).toEqual(data1);
          }
          if (count === 1) {
            expect(stripSymbols(data)).toEqual(data2);
          }
          if (count === 2) {
            expect(stripSymbols(data)).toEqual(data1);
            done();
          }
          count += 1;
        }

        render() {
          const { variables } = this.state;

          return (
            <AllPeopleQuery
              query={query}
              variables={variables}
              onCompleted={this.onCompleted}
            >
              {() => null}
            </AllPeopleQuery>
          );
        }
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('onError with data', done => {
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

      const mocks = [
        {
          request: { query: allPeopleQuery },
          result: { data: data }
        }
      ];

      const onErrorFunc = (queryError: ApolloError) => {
        expect(queryError).toEqual(null);
        done();
      };

      const onError = jest.fn();

      const Component = () => (
        <Query query={allPeopleQuery} onError={onErrorFunc}>
          {({ loading }: any) => {
            if (!loading) {
              expect(onError).not.toHaveBeenCalled();
              done();
            }
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
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
      console.error = () => {};
      expect(() => {
        render(
          <MockedProvider>
            <Query query={mutation}>{() => null}</Query>
          </MockedProvider>
        );
      }).toThrowError(
        'Running a Query requires a graphql Query, but a Mutation was used ' +
          'instead.'
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
      console.error = () => {};
      expect(() => {
        render(
          <MockedProvider>
            <Query query={subscription}>{() => null}</Query>
          </MockedProvider>
        );
      }).toThrowError(
        'Running a Query requires a graphql Query, but a Subscription was ' +
          'used instead.'
      );

      console.error = errorLogger;
    });

    it('onCompleted with error', done => {
      const mockError = [
        {
          request: { query: allPeopleQuery },
          error: new Error('error occurred')
        }
      ];

      const onCompleted = jest.fn();

      const Component = () => (
        <Query query={allPeopleQuery} onCompleted={onCompleted}>
          {({ error }: any) => {
            if (error) {
              expect(onCompleted).not.toHaveBeenCalled();
              done();
            }
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mockError} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('onError with error', done => {
      const error = new Error('error occurred');
      const mockError = [
        {
          request: { query: allPeopleQuery },
          error: error
        }
      ];

      const onErrorFunc = (queryError: ApolloError) => {
        expect(queryError.networkError).toEqual(error);
        done();
      };

      const Component = () => (
        <Query query={allPeopleQuery} onError={onErrorFunc}>
          {() => {
            return null;
          }}
        </Query>
      );

      render(
        <MockedProvider mocks={mockError} addTypename={false}>
          <Component />
        </MockedProvider>
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
          result: { data: data1 }
        },
        {
          request: { query, variables: { first: 2 } },
          result: { data: data2 }
        }
      ];

      let count = 0;

      class Component extends React.Component {
        state = {
          variables: {
            first: 1
          }
        };

        componentDidMount() {
          setTimeout(() => {
            this.setState({
              variables: {
                first: 2
              }
            });
          }, 50);
        }

        render() {
          const { variables } = this.state;

          return (
            <AllPeopleQuery query={query} variables={variables}>
              {(result: any) => {
                if (result.loading) {
                  return null;
                }
                try {
                  if (count === 0) {
                    expect(variables).toEqual({ first: 1 });
                    expect(stripSymbols(result.data)).toEqual(data1);
                  }
                  if (count === 1) {
                    expect(variables).toEqual({ first: 2 });
                    expect(stripSymbols(result.data)).toEqual(data2);
                    done();
                  }
                } catch (error) {
                  done.fail(error);
                }

                count++;
                return null;
              }}
            </AllPeopleQuery>
          );
        }
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
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
          result: { data: data1 }
        },
        {
          request: { query: query2 },
          result: { data: data2 }
        }
      ];

      let count = 0;

      class Component extends React.Component {
        state = {
          query: query1
        };

        render() {
          const { query } = this.state;

          return (
            <Query query={query}>
              {(result: any) => {
                if (result.loading) return null;
                try {
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
                } catch (error) {
                  done.fail(error);
                }

                count++;
                return null;
              }}
            </Query>
          );
        }
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('use client from props or context', done => {
      jest.useFakeTimers();

      function newClient(name: string) {
        const link = mockSingleLink({
          request: { query: allPeopleQuery },
          result: { data: { allPeople: { people: [{ name }] } } }
        });

        return new ApolloClient({
          link,
          cache: new Cache({ addTypename: false }),
          name
        });
      }

      const skywalker = newClient('Luke Skywalker');
      const ackbar = newClient('Admiral Ackbar');
      const solo = newClient('Han Solo');

      const propsChanges = [
        {
          propsClient: null,
          contextClient: ackbar,
          renderedName: (name: string) => expect(name).toEqual('Admiral Ackbar')
        },
        {
          propsClient: null,
          contextClient: skywalker,
          renderedName: (name: string) => expect(name).toEqual('Luke Skywalker')
        },
        {
          propsClient: solo,
          contextClient: skywalker,
          renderedName: (name: string) => expect(name).toEqual('Han Solo')
        },
        {
          propsClient: null,
          contextClient: ackbar,
          renderedName: (name: string) => expect(name).toEqual('Admiral Ackbar')
        },
        {
          propsClient: skywalker,
          contextClient: null,
          renderedName: (name: string) => expect(name).toEqual('Luke Skywalker')
        }
      ];

      class Component extends React.Component<any, any> {
        render() {
          if (Object.keys(this.props).length === 0) {
            return null;
          }

          const query = (
            <Query query={allPeopleQuery} client={this.props.propsClient}>
              {(result: any) => {
                if (result.data && result.data.allPeople) {
                  this.props.renderedName(result.data.allPeople.people[0].name);
                }

                return null;
              }}
            </Query>
          );

          if (this.props.contextClient) {
            return (
              <ApolloProvider client={this.props.contextClient}>
                {query}
              </ApolloProvider>
            );
          }

          return query;
        }
      }

      const { rerender } = render(<Component />);

      propsChanges.forEach(props => {
        rerender(<Component {...props} />);
        jest.runAllTimers();
      });

      done();
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
          people: [{ name: 'Luke Skywalker' }]
        }
      };
      const data2 = {
        allPeople: { people: [{ name: 'Han Solo' }] }
      };
      const mocks = [
        {
          request: { query, variables: { first: 1 } },
          result: { data: data1 }
        },
        {
          request: { query, variables: { first: 2 } },
          result: { data: data2 }
        }
      ];

      let count = 0;

      class Component extends React.Component {
        state = {
          variables: {
            first: 1
          }
        };

        componentDidMount() {
          setTimeout(() => {
            this.setState({
              variables: {
                first: 2
              }
            });
          }, 50);
        }

        render() {
          const { variables } = this.state;

          return (
            <AllPeopleQuery query={query} variables={variables}>
              {(result: any) => {
                if (result.loading && count === 2) {
                  expect(stripSymbols(result.data)).toEqual(data1);
                  done();
                }

                count++;
                return null;
              }}
            </AllPeopleQuery>
          );
        }
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <Component />
        </MockedProvider>
      );
    });

    it('should update if a manual `refetch` is triggered after a state change', done => {
      const query: DocumentNode = gql`
        query {
          allPeople {
            people {
              name
            }
          }
        }
      `;

      const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

      const link = mockSingleLink(
        {
          request: { query },
          result: { data: data1 }
        },
        {
          request: { query },
          result: { data: data1 }
        },
        {
          request: { query },
          result: { data: data1 }
        }
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false })
      });

      let count = 0;

      class SomeComponent extends React.Component {
        constructor(props: any) {
          super(props);
          this.state = {
            open: false
          };
          this.toggle = this.toggle.bind(this);
        }

        toggle() {
          this.setState((prevState: any) => ({
            open: !prevState.open
          }));
        }

        render() {
          const { open } = this.state as any;
          return (
            <Query client={client} query={query} notifyOnNetworkStatusChange>
              {(props: any) => {
                try {
                  switch (count) {
                    case 0:
                      // Loading first response
                      expect(props.loading).toBe(true);
                      expect(open).toBe(false);
                      break;
                    case 1:
                      // First response loaded, change state value
                      expect(stripSymbols(props.data)).toEqual(data1);
                      expect(open).toBe(false);
                      setTimeout(() => {
                        this.toggle();
                      }, 0);
                      break;
                    case 2:
                      // State value changed, fire a refetch
                      expect(open).toBe(true);
                      setTimeout(() => {
                        props.refetch();
                      }, 0);
                      break;
                    case 3:
                      // Second response received, fire another refetch
                      expect(stripSymbols(props.data)).toEqual(data1);
                      setTimeout(() => {
                        props.refetch();
                      }, 0);
                      break;
                    case 4:
                      // Third response received
                      expect(stripSymbols(props.data)).toEqual(data1);
                      done();
                      break;
                    default:
                      done.fail('Unknown count');
                  }
                  count += 1;
                } catch (error) {
                  done.fail(error);
                }
                return null;
              }}
            </Query>
          );
        }
      }

      render(<SomeComponent />);
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
    console.error = () => {};

    class Component extends React.Component {
      state = { query: allPeopleQuery };

      componentDidCatch(error: any) {
        const expectedError = new Error(
          'Running a Query requires a graphql Query, but a Subscription was ' +
            'used instead.'
        );
        expect(error).toEqual(expectedError);
        done();
      }

      componentDidMount() {
        setTimeout(() => {
          this.setState({
            query: subscription
          });
        }, 0);
      }

      render() {
        const { query } = this.state;
        return <Query query={query}>{() => null}</Query>;
      }
    }

    render(
      <MockedProvider mocks={allPeopleMocks} addTypename={false}>
        <Component />
      </MockedProvider>
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
      { request: { query }, result: { data: dataTwo } }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    let count = 0;
    const noop = () => null;

    // class AllPeopleQuery2 extends Query<Data> {}
    const AllPeopleQuery2 = Query;

    function Container() {
      return (
        <AllPeopleQuery2 query={query} notifyOnNetworkStatusChange>
          {(result: any) => {
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
                  expect(stripSymbols(result.data!.allPeople)).toEqual(
                    data.allPeople
                  );
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
                  expect(stripSymbols(result.data.allPeople)).toEqual(
                    dataTwo.allPeople
                  );
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

    render(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );
  });

  it(
    'should not persist previous result errors when a subsequent valid ' +
      'result is received',
    done => {
      const query: DocumentNode = gql`
        query somethingelse($variable: Boolean) {
          allPeople(first: 1, yetisArePeople: $variable) {
            people {
              name
            }
          }
        }
      `;

      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const variableGood = { variable: true };
      const variableBad = { variable: false };

      const link = mockSingleLink(
        {
          request: {
            query,
            variables: variableGood
          },
          result: {
            data
          }
        },
        {
          request: {
            query,
            variables: variableBad
          },
          result: {
            errors: [new Error('This is an error!')]
          }
        },
        {
          request: {
            query,
            variables: variableGood
          },
          result: {
            data
          }
        }
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false })
      });

      let rerender: any;
      let count = 0;
      const DummyComp = (props: any) => {
        if (!props.loading) {
          try {
            switch (count++) {
              case 0:
                expect(props.data.allPeople).toBeTruthy();
                expect(props.error).toBeFalsy();
                // Change query variables to trigger bad result.
                setTimeout(() => {
                  rerender(
                    <Query
                      client={client}
                      query={query}
                      variables={variableBad}
                    >
                      {(result: any) => {
                        return <DummyComp id="dummyId" {...result} />;
                      }}
                    </Query>
                  );
                }, 0);
                break;
              case 1:
                // Error should be received, but last known good value
                // should still be accessible (in-case the UI needs it).
                expect(props.error).toBeTruthy();
                expect(props.data.allPeople).toBeTruthy();
                // Change query variables to trigger a good result.
                setTimeout(() => {
                  rerender(
                    <Query
                      client={client}
                      query={query}
                      variables={variableGood}
                    >
                      {(result: any) => {
                        return <DummyComp id="dummyId" {...result} />;
                      }}
                    </Query>
                  );
                }, 0);
                break;
              case 2:
                // Good result should be received without any errors.
                expect(props.error).toBeFalsy();
                expect(props.data.allPeople).toBeTruthy();
                done();
                break;
              default:
                done.fail('Unknown count');
            }
          } catch (error) {
            done.fail(error);
          }
        }
        return null;
      };

      rerender = render(
        <Query client={client} query={query} variables={variableGood}>
          {(result: any) => {
            return <DummyComp id="dummyId" {...result} />;
          }}
        </Query>
      ).rerender;
    }
  );

  it('should not repeatedly call onCompleted if setState in it', done => {
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
        result: { data: data1 }
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: data2 }
      }
    ];

    let onCompletedCallCount = 0,
      updateCount = 0;
    class Component extends React.Component {
      state = {
        variables: {
          first: 1
        }
      };
      onCompleted = () => {
        onCompletedCallCount += 1;
        this.setState({ causeUpdate: true });
      };
      componentDidUpdate() {
        updateCount += 1;
        if (updateCount === 1) {
          // `componentDidUpdate` in `Query` is triggered by the `setState`
          // in `onCompleted`. It will be called before `componentDidUpdate`
          // in `Component`. `onCompleted` should have been called only once
          // in the entire lifecycle.
          expect(onCompletedCallCount).toBe(1);
          done();
        }
      }
      render() {
        return (
          <Query
            query={query}
            variables={this.state.variables}
            onCompleted={this.onCompleted}
          >
            {() => null}
          </Query>
        );
      }
    }

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Component />
      </MockedProvider>
    );
  });

  it('should not repeatedly call onCompleted when cache exists if setState in it', done => {
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
        result: { data: data1 }
      },
      {
        request: { query, variables: { first: 2 } },
        result: { data: data2 }
      }
    ];

    let onCompletedCallCount = 0,
      updateCount = 0;
    expect.assertions(1);

    class Component extends React.Component {
      state = {
        variables: {
          first: 1
        }
      };

      componentDidMount() {
        setTimeout(() => {
          this.setState({
            variables: {
              first: 2
            }
          });
          setTimeout(() => {
            this.setState({
              variables: {
                first: 1
              }
            });
          }, 50);
        }, 50);
      }

      // Make sure `onCompleted` is called both when new data is being
      // fetched over the network, and when data is coming back from
      // the cache.
      onCompleted() {
        onCompletedCallCount += 1;
      }

      componentDidUpdate() {
        updateCount += 1;
        if (updateCount === 2) {
          // Should be 3 since we change variables twice + initial variables.
          expect(onCompletedCallCount).toBe(3);
          done();
        }
      }

      render() {
        const { variables } = this.state;
        return (
          <AllPeopleQuery
            query={query}
            variables={variables}
            onCompleted={this.onCompleted}
          >
            {() => null}
          </AllPeopleQuery>
        );
      }
    }

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Component />
      </MockedProvider>
    );
  });

  it('should not repeatedly call onError if setState in it', done => {
    const mockError = [
      {
        request: { query: allPeopleQuery },
        error: new Error('error occurred')
      }
    ];

    let onErrorCallCount = 0,
      updateCount = 0;
    class Component extends React.Component {
      state = {
        variables: {
          first: 1
        }
      };
      onError = () => {
        onErrorCallCount += 1;
        this.setState({ causeUpdate: true });
      };
      componentDidUpdate() {
        updateCount += 1;
        if (updateCount === 1) {
          // the cDU in Query is triggered by setState in onError
          // will be called before cDU in Component
          // onError should have been called only once in whole lifecycle
          expect(onErrorCallCount).toBe(1);
          done();
        }
      }
      render() {
        return (
          <Query
            query={allPeopleQuery}
            variables={this.state.variables}
            onError={this.onError}
          >
            {() => null}
          </Query>
        );
      }
    }

    render(
      <MockedProvider mocks={mockError} addTypename={false}>
        <Component />
      </MockedProvider>
    );
  });

  describe('Partial refetching', () => {
    const origConsoleWarn = console.warn;

    beforeAll(() => {
      console.warn = () => null;
    });

    afterAll(() => {
      console.warn = origConsoleWarn;
    });

    it(
      'should attempt a refetch when the query result was marked as being ' +
        'partial, the returned data was reset to an empty Object by the ' +
        'Apollo Client QueryManager (due to a cache miss), and the ' +
        '`partialRefetch` prop is `true`',
      done => {
        const query = allPeopleQuery;
        const link = mockSingleLink(
          { request: { query }, result: { data: {} } },
          { request: { query }, result: { data: allPeopleData } }
        );

        const client = new ApolloClient({
          link,
          cache: new Cache({ addTypename: false })
        });

        let count = 0;
        const Component = () => (
          <Query query={allPeopleQuery} partialRefetch>
            {(result: any) => {
              const { data, loading } = result;
              if (!loading) {
                expect(stripSymbols(data)).toEqual(allPeopleData);
                done();
              }
              return null;
            }}
          </Query>
        );

        render(
          <ApolloProvider client={client}>
            <Component />
          </ApolloProvider>
        );
      }
    );

    it(
      'should not refetch when an empty partial is returned if the ' +
        '`partialRefetch` prop is false/not set',
      done => {
        const query = allPeopleQuery;
        const link = mockSingleLink({
          request: { query },
          result: { data: {} }
        });

        const client = new ApolloClient({
          link,
          cache: new Cache({ addTypename: false })
        });

        const Component = () => (
          <Query query={allPeopleQuery}>
            {(result: any) => {
              const { data, loading } = result;
              if (!loading) {
                expect(data).toEqual({});
                done();
              }
              return null;
            }}
          </Query>
        );

        render(
          <ApolloProvider client={client}>
            <Component />
          </ApolloProvider>
        );
      }
    );
  });

  // https://github.com/apollographql/react-apollo/issues/2424
  it('should be able to access data keys without a type guard', () => {
    const Component = () => (
      <AllPeopleQuery query={allPeopleQuery}>
        {(result: any) => {
          if (result.data && result.data.allPeople) {
            return null;
          }

          if (result.data && result.data!.allPeople) {
            return null;
          }

          const { allPeople } = result.data!;
          return null;
        }}
      </AllPeopleQuery>
    );
  });

  it(
    'should keep data for a `Query` component using `no-cache` when the ' +
      'tree is re-rendered',
    done => {
      const query1 = allPeopleQuery;

      const query2: DocumentNode = gql`
        query Things {
          allThings {
            thing {
              description
            }
          }
        }
      `;

      interface ThingData {
        allThings: {
          thing: Array<{ description: string }>;
        };
      }

      const allThingsData: ThingData = {
        allThings: {
          thing: [{ description: 'Thing 1' }, { description: 'Thing 2' }]
        }
      };

      const link = mockSingleLink(
        { request: { query: query1 }, result: { data: allPeopleData } },
        { request: { query: query2 }, result: { data: allThingsData } }
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false })
      });

      let expectCount = 0;

      const People = () => {
        let renderCount = 0;
        return (
          <Query query={query1} fetchPolicy="no-cache">
            {({ data, loading }: any) => {
              if (renderCount > 0 && !loading) {
                expect(data).toEqual(allPeopleData);
                expectCount += 1;
                if (expectCount === 2) done();
              }
              renderCount += 1;
              return null;
            }}
          </Query>
        );
      };

      const Things = () => (
        <Query query={query2}>
          {({ data, loading }: any) => {
            if (!loading) {
              expect(data).toEqual(allThingsData);
              expectCount += 1;
              if (expectCount === 2) done();
            }
            return null;
          }}
        </Query>
      );

      const App = () => (
        <ApolloProvider client={client}>
          <People />
          <Things />
        </ApolloProvider>
      );

      render(<App />);
    }
  );

  describe('Return partial data', () => {
    it('should not return partial cache data when `returnPartialData` is false', () => {
      const cache = new Cache();
      const client = new ApolloClient({
        cache,
        link: ApolloLink.empty()
      });

      const fullQuery = gql`
        query {
          cars {
            make
            model
            repairs {
              date
              description
            }
          }
        }
      `;

      cache.writeQuery({
        query: fullQuery,
        data: {
          cars: [
            {
              __typename: 'Car',
              make: 'Ford',
              model: 'Mustang',
              vin: 'PONY123',
              repairs: [
                {
                  __typename: 'Repair',
                  date: '2019-05-08',
                  description: 'Could not get after it.'
                }
              ]
            }
          ]
        }
      });

      const partialQuery = gql`
        query {
          cars {
            repairs {
              date
              cost
            }
          }
        }
      `;

      const App = () => (
        <ApolloProvider client={client}>
          <Query query={partialQuery}>
            {({ data }: any) => {
              expect(data).toEqual({});
              return null;
            }}
          </Query>
        </ApolloProvider>
      );

      render(<App />);
    });

    it('should return partial cache data when `returnPartialData` is true', () => {
      const cache = new Cache();
      const client = new ApolloClient({
        cache,
        link: ApolloLink.empty()
      });

      const fullQuery = gql`
        query {
          cars {
            make
            model
            repairs {
              date
              description
            }
          }
        }
      `;

      cache.writeQuery({
        query: fullQuery,
        data: {
          cars: [
            {
              __typename: 'Car',
              make: 'Ford',
              model: 'Mustang',
              vin: 'PONY123',
              repairs: [
                {
                  __typename: 'Repair',
                  date: '2019-05-08',
                  description: 'Could not get after it.'
                }
              ]
            }
          ]
        }
      });

      const partialQuery = gql`
        query {
          cars {
            repairs {
              date
              cost
            }
          }
        }
      `;

      const App = () => (
        <ApolloProvider client={client}>
          <Query query={partialQuery} returnPartialData>
            {({ data }: any) => {
              expect(data).toEqual({
                cars: [
                  {
                    __typename: 'Car',
                    repairs: [
                      {
                        __typename: 'Repair',
                        date: '2019-05-08'
                      }
                    ]
                  }
                ]
              });
              return null;
            }}
          </Query>
        </ApolloProvider>
      );

      render(<App />);
    });
  });
});
