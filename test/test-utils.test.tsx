import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';

import { graphql, ChildProps } from '../src';
import { MockedProvider, mockSingleLink } from '../src/test-utils';
import { MockedResponse } from '../src/test-links';
import { DocumentNode } from 'graphql';

const variables = {
  username: 'mock_username',
};

const userWithoutTypeName = {
  id: 'user_id',
};

const user = {
  __typename: 'User',
  ...userWithoutTypeName,
};

const query: DocumentNode = gql`
  query GetUser($username: String!) {
    user(username: $username) {
      id
    }
  }
`;
const queryWithTypename: DocumentNode = gql`
  query GetUser($username: String!) {
    user(username: $username) {
      id
      __typename
    }
  }
`;

interface Data {
  user: {
    id: string;
  };
}

interface Variables {
  username: string;
}

const withUser = graphql<Variables, Data, Variables>(query, {
  options: props => ({
    variables: props,
  }),
});

const mocks: ReadonlyArray<MockedResponse> = [
  {
    request: {
      query,
      variables,
    },
    result: { data: { user } },
  },
];

it('mocks the data', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      expect(nextProps.data!.user).toMatchSnapshot();
      done();
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  renderer.create(
    <MockedProvider mocks={mocks}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('allows for querying with the typename', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      expect(nextProps.data!.user).toMatchSnapshot();
      done();
    }

    render() {
      return null;
    }
  }

  const withUserAndTypename = graphql<Variables, Data, Variables>(queryWithTypename, {
    options: props => ({
      variables: props,
    }),
  });

  const ContainerWithData = withUserAndTypename(Container);

  const mocksWithTypename = [
    {
      request: {
        query: queryWithTypename,
        variables,
      },
      result: { data: { user } },
    },
  ];

  renderer.create(
    <MockedProvider mocks={mocksWithTypename}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('allows for using a custom cache', done => {
  const cache = new InMemoryCache();
  cache.writeQuery({
    query,
    variables,
    data: { user },
  });

  const Container: React.SFC<ChildProps<Variables, Data, Variables>> = props => {
    expect(props.data).toMatchObject({ user });
    done();

    return null;
  };
  const ContainerWithData = withUser(Container);
  renderer.create(
    <MockedProvider mocks={[]} cache={cache}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('errors if the variables in the mock and component do not match', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      try {
        expect(nextProps.data!.user).toBeUndefined();
        expect(nextProps.data!.error).toMatchSnapshot();
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  const variables2 = {
    username: 'other_user',
  };

  renderer.create(
    <MockedProvider mocks={mocks}>
      <ContainerWithData {...variables2} />
    </MockedProvider>,
  );
});

it('errors if the variables do not deep equal', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      try {
        expect(nextProps.data!.user).toBeUndefined();
        expect(nextProps.data!.error).toMatchSnapshot();
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  const mocks2 = [
    {
      request: {
        query,
        variables: {
          age: 13,
          username: 'some_user',
        },
      },
      result: { data: { user } },
    },
  ];

  const variables2 = {
    username: 'some_user',
    age: 42,
  };

  renderer.create(
    <MockedProvider mocks={mocks2}>
      <ContainerWithData {...variables2} />
    </MockedProvider>,
  );
});

it('does not error if the variables match but have different order', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      expect(nextProps.data!.user).toMatchSnapshot();
      done();
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  const mocks2 = [
    {
      request: {
        query,
        variables: {
          age: 13,
          username: 'some_user',
        },
      },
      result: { data: { user } },
    },
  ];

  const variables2 = {
    username: 'some_user',
    age: 13,
  };

  renderer.create(
    <MockedProvider mocks={mocks2}>
      <ContainerWithData {...variables2} />
    </MockedProvider>,
  );
});

it('mocks a network error', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      try {
        expect(nextProps.data!.error).toEqual(new Error('Network error: something went wrong'));
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  const mocksError = [
    {
      request: {
        query,
        variables,
      },
      error: new Error('something went wrong'),
    },
  ];

  renderer.create(
    <MockedProvider mocks={mocksError}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('errors if the query in the mock and component do not match', done => {
  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      try {
        expect(nextProps.data!.user).toBeUndefined();
        expect(nextProps.data!.error).toMatchSnapshot();
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  const mocksDifferentQuery = [
    {
      request: {
        query: gql`
          query OtherQuery {
            otherQuery {
              id
            }
          }
        `,
        variables,
      },
      result: { data: { user } },
    },
  ];

  renderer.create(
    <MockedProvider mocks={mocksDifferentQuery}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('passes down props prop in mock as props for the component', done => {
  interface VariablesWithProps {
    username: string;
    [propName: string]: any;
  }

  class Container extends React.Component<ChildProps<VariablesWithProps, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<VariablesWithProps, Data, Variables>) {
      try {
        expect(nextProps.foo).toBe('bar');
        expect(nextProps.baz).toBe('qux');
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const withUser2 = graphql<VariablesWithProps, Data, Variables>(query, {
    options: props => ({
      variables: { username: props.username },
    }),
  });

  const ContainerWithData = withUser2(Container);

  renderer.create(
    <MockedProvider mocks={mocks} childProps={{ foo: 'bar', baz: 'qux' }}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('doesnt crash on unmount if there is no query manager', () => {
  class Container extends React.Component {
    render() {
      return null;
    }
  }

  renderer
    .create(
      <MockedProvider>
        <Container />
      </MockedProvider>,
    )
    .unmount();
});

it('should support returning mocked results from a function', done => {
  let resultReturned = false;

  const testUser = {
    __typename: 'User',
    id: 12345,
  };

  class Container extends React.Component<ChildProps<Variables, Data, Variables>> {
    componentWillReceiveProps(nextProps: ChildProps<Variables, Data, Variables>) {
      try {
        expect(nextProps.data!.user).toEqual(testUser);
        expect(resultReturned).toBe(true);
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUser(Container);

  const testQuery: DocumentNode = gql`
    query GetUser($username: String!) {
      user(username: $username) {
        id
      }
    }
  `;

  const testVariables = {
    username: 'jsmith',
  };
  const testMocks = [
    {
      request: {
        query: testQuery,
        variables: testVariables,
      },
      result() {
        resultReturned = true;
        return {
          data: {
            user: {
              __typename: 'User',
              id: 12345,
            },
          },
        };
      },
    },
  ];

  renderer.create(
    <MockedProvider mocks={testMocks}>
      <ContainerWithData {...testVariables} />
    </MockedProvider>,
  );
});

it('allows for @connection queries', done => {
  const feedQuery: DocumentNode = gql`
    query GetUserFeed($username: String!, $offset: Int, $limit: Int) {
      userFeed(username: $username, offset: $offset, limit: $limit)
        @connection(key: "userFeed", filter: ["username"]) {
        title
      }
    }
  `;

  interface FeedData {
    userFeed: Array<{
      __typename: 'UserFeedItem';
      title: string;
    }>;
  }

  interface FeedVariables {
    username: string;
    offset: number;
    limit: number;
  }

  const withUserFeed = graphql<FeedVariables, FeedData, FeedVariables>(feedQuery, {
    options: props => ({
      variables: props,
    }),
  });

  const feedVariables = { username: 'another_user', offset: 0, limit: 10 };
  const feedMocks: MockedResponse[] = [
    {
      request: {
        query: feedQuery,
        variables: feedVariables,
      },
      result: {
        data: {
          userFeed: [
            {
              __typename: 'UserFeedItem',
              title: 'First!',
            },
          ],
        },
      },
    },
  ];

  class Container extends React.Component<ChildProps<FeedVariables, FeedData, FeedVariables>> {
    componentWillReceiveProps(nextProps: ChildProps<FeedVariables, FeedData, FeedVariables>) {
      try {
        expect(nextProps.data).toBeDefined();
        expect(nextProps.data!.userFeed).toHaveLength(1);
        expect(nextProps.data!.userFeed![0].title).toEqual('First!');
        expect(nextProps.data!.variables).toEqual(feedVariables);
        done();
      } catch (e) {
        done.fail(e);
      }
    }

    render() {
      return null;
    }
  }

  const ContainerWithData = withUserFeed(Container);

  renderer.create(
    <MockedProvider mocks={feedMocks}>
      <ContainerWithData {...feedVariables} />
    </MockedProvider>,
  );
});

describe('@client testing', () => {
  it(
    'should support using @client fields in the mocked link chain, when not ' +
    'using local resolvers',
    done => {
      const networkStatusQuery: DocumentNode = gql`
        query NetworkStatus {
          networkStatus @client {
            isOnline
          }
        }
      `;

      interface NetworkStatus {
        networkStatus: {
          __typename: 'NetworkStatus';
          isOnline: boolean;
        };
      }

      const withNetworkStatus = graphql<{}, NetworkStatus>(networkStatusQuery);

      const networkStatusMocks: MockedResponse[] = [
        {
          request: {
            query: networkStatusQuery,
          },
          result: {
            data: {
              networkStatus: {
                __typename: 'NetworkStatus',
                isOnline: true,
              },
            },
          },
        },
      ];

      class Container extends React.Component<ChildProps<{}, NetworkStatus>> {
        componentWillReceiveProps(nextProps: ChildProps<{}, NetworkStatus>) {
          try {
            expect(nextProps.data).toBeDefined();
            expect(nextProps.data!.networkStatus.__typename).toEqual('NetworkStatus');
            expect(nextProps.data!.networkStatus.isOnline).toEqual(true);
            done();
          } catch (e) {
            done.fail(e);
          }
        }

        render() {
          return null;
        }
      }

      const ContainerWithData = withNetworkStatus(Container);

      renderer.create(
        <MockedProvider mocks={networkStatusMocks}>
          <ContainerWithData />
        </MockedProvider>,
      );
    }
  );

  it(
    'should prevent @client fields from being sent through the mocked link ' +
    'chain, when using local resolvers',
    done => {
      const productQuery: DocumentNode = gql`
        query FindProduct($name: String!) {
          product(name: $name) {
            name
            isInCart @client
          }
        }
      `;

      interface ProductData {
        product: Array<{
          __typename: 'Product';
          name: string;
        }>;
      }

      interface ProductVariables {
        name: string;
      }

      const withProduct =
        graphql<ProductVariables, ProductData, ProductVariables>(productQuery, {
          options: props => ({
            variables: props,
          }),
        });

      const productVariables = { name: 'ACME 1' };
      const productMocks: MockedResponse[] = [
        {
          request: {
            query: productQuery,
            variables: productVariables,
          },
          result: {
            data: {
              product: [
                {
                  __typename: 'Product',
                  name: 'ACME 1',
                },
              ],
            },
          },
        },
      ];

      class Container extends React.Component<ChildProps<ProductVariables, ProductData, ProductVariables>> {
        componentWillReceiveProps(nextProps: ChildProps<ProductVariables, ProductData, ProductVariables>) {
          try {
            expect(nextProps.data).toBeDefined();
            expect(nextProps.data!.product).toHaveLength(1);
            expect(nextProps.data!.product![0].name).toEqual('ACME 1');
            expect(nextProps.data!.variables).toEqual(productVariables);
            done();
          } catch (e) {
            done.fail(e);
          }
        }

        render() {
          return null;
        }
      }

      const ContainerWithData = withProduct(Container);

      const resolvers = {
        Product: {
          isInCart() {
            return true;
          },
        },
      };

      renderer.create(
        <MockedProvider mocks={productMocks} resolvers={resolvers}>
          <ContainerWithData {...productVariables} />
        </MockedProvider>,
      );
    }
  );
});
