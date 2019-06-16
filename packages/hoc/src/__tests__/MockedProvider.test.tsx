import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import { MockedProvider, MockedResponse } from '@apollo/react-testing';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps } from '@apollo/react-hoc';

const variables = {
  username: 'mock_username'
};

const userWithoutTypeName = {
  id: 'user_id'
};

const user = {
  __typename: 'User',
  ...userWithoutTypeName
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
    variables: props
  })
});

const mocks: ReadonlyArray<MockedResponse> = [
  {
    request: {
      query,
      variables
    },
    result: { data: { user } }
  }
];

describe('General use', () => {
  afterEach(cleanup);

  it('mocks the data', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        expect(this.props.data!.user).toMatchSnapshot();
        done();
      }

      render() {
        return null;
      }
    }

    const ContainerWithData = withUser(Container);

    render(
      <MockedProvider mocks={mocks}>
        <ContainerWithData {...variables} />
      </MockedProvider>
    );
  });

  it('allows for querying with the typename', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        expect(this.props.data!.user).toMatchSnapshot();
        done();
      }

      render() {
        return null;
      }
    }

    const withUserAndTypename = graphql<Variables, Data, Variables>(
      queryWithTypename,
      {
        options: props => ({
          variables: props
        })
      }
    );

    const ContainerWithData = withUserAndTypename(Container);

    const mocksWithTypename = [
      {
        request: {
          query: queryWithTypename,
          variables
        },
        result: { data: { user } }
      }
    ];

    render(
      <MockedProvider mocks={mocksWithTypename}>
        <ContainerWithData {...variables} />
      </MockedProvider>
    );
  });

  it('allows for using a custom cache', done => {
    const cache = new InMemoryCache();
    cache.writeQuery({
      query,
      variables,
      data: { user }
    });

    const Container: React.SFC<
      ChildProps<Variables, Data, Variables>
    > = props => {
      expect(props.data).toMatchObject({ user });
      done();

      return null;
    };
    const ContainerWithData = withUser(Container);
    render(
      <MockedProvider mocks={[]} cache={cache}>
        <ContainerWithData {...variables} />
      </MockedProvider>
    );
  });

  it('errors if the variables in the mock and component do not match', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        try {
          expect(this.props.data!.user).toBeUndefined();
          expect(this.props.data!.error).toMatchSnapshot();
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
      username: 'other_user'
    };

    render(
      <MockedProvider mocks={mocks}>
        <ContainerWithData {...variables2} />
      </MockedProvider>
    );
  });

  it('errors if the variables do not deep equal', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        try {
          expect(this.props.data!.user).toBeUndefined();
          expect(this.props.data!.error).toMatchSnapshot();
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
            username: 'some_user'
          }
        },
        result: { data: { user } }
      }
    ];

    const variables2 = {
      username: 'some_user',
      age: 42
    };

    render(
      <MockedProvider mocks={mocks2}>
        <ContainerWithData {...variables2} />
      </MockedProvider>
    );
  });

  it('does not error if the variables match but have different order', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        expect(this.props.data!.user).toMatchSnapshot();
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
            username: 'some_user'
          }
        },
        result: { data: { user } }
      }
    ];

    const variables2 = {
      username: 'some_user',
      age: 13
    };

    render(
      <MockedProvider mocks={mocks2}>
        <ContainerWithData {...variables2} />
      </MockedProvider>
    );
  });

  it('mocks a network error', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        try {
          expect(this.props.data!.error).toEqual(
            new Error('Network error: something went wrong')
          );
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
          variables
        },
        error: new Error('something went wrong')
      }
    ];

    render(
      <MockedProvider mocks={mocksError}>
        <ContainerWithData {...variables} />
      </MockedProvider>
    );
  });

  it('errors if the query in the mock and component do not match', done => {
    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        try {
          expect(this.props.data!.user).toBeUndefined();
          expect(this.props.data!.error).toMatchSnapshot();
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
          variables
        },
        result: { data: { user } }
      }
    ];

    render(
      <MockedProvider mocks={mocksDifferentQuery}>
        <ContainerWithData {...variables} />
      </MockedProvider>
    );
  });

  it('passes down props prop in mock as props for the component', done => {
    interface VariablesWithProps {
      username: string;
      [propName: string]: any;
    }

    class Container extends React.Component<
      ChildProps<VariablesWithProps, Data, Variables>
    > {
      componentDidUpdate() {
        try {
          expect(this.props.foo).toBe('bar');
          expect(this.props.baz).toBe('qux');
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
        variables: { username: props.username }
      })
    });

    const ContainerWithData = withUser2(Container);

    render(
      <MockedProvider mocks={mocks} childProps={{ foo: 'bar', baz: 'qux' }}>
        <ContainerWithData {...variables} />
      </MockedProvider>
    );
  });

  it('doesnt crash on unmount if there is no query manager', () => {
    class Container extends React.Component {
      render() {
        return null;
      }
    }

    const { unmount } = render(
      <MockedProvider>
        <Container />
      </MockedProvider>
    );
    unmount();
  });

  it('should support returning mocked results from a function', done => {
    let resultReturned = false;

    const testUser = {
      __typename: 'User',
      id: 12345
    };

    class Container extends React.Component<
      ChildProps<Variables, Data, Variables>
    > {
      componentDidUpdate() {
        try {
          expect(this.props.data!.user).toEqual(testUser);
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
      username: 'jsmith'
    };
    const testMocks = [
      {
        request: {
          query: testQuery,
          variables: testVariables
        },
        result() {
          resultReturned = true;
          return {
            data: {
              user: {
                __typename: 'User',
                id: 12345
              }
            }
          };
        }
      }
    ];

    render(
      <MockedProvider mocks={testMocks}>
        <ContainerWithData {...testVariables} />
      </MockedProvider>
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

    const withUserFeed = graphql<FeedVariables, FeedData, FeedVariables>(
      feedQuery,
      {
        options: props => ({
          variables: props
        })
      }
    );

    const feedVariables = { username: 'another_user', offset: 0, limit: 10 };
    const feedMocks: MockedResponse[] = [
      {
        request: {
          query: feedQuery,
          variables: feedVariables
        },
        result: {
          data: {
            userFeed: [
              {
                __typename: 'UserFeedItem',
                title: 'First!'
              }
            ]
          }
        }
      }
    ];

    class Container extends React.Component<
      ChildProps<FeedVariables, FeedData, FeedVariables>
    > {
      componentDidUpdate() {
        const nextProps = this.props;
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

    render(
      <MockedProvider mocks={feedMocks}>
        <ContainerWithData {...feedVariables} />
      </MockedProvider>
    );
  });
});

describe('@client testing', () => {
  let warn = console.warn;
  beforeAll(() => {
    console.warn = () => null;
  });

  afterAll(() => {
    console.warn = warn;
  });

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
            query: networkStatusQuery
          },
          result: {
            data: {
              networkStatus: {
                __typename: 'NetworkStatus',
                isOnline: true
              }
            }
          }
        }
      ];

      class Container extends React.Component<ChildProps<{}, NetworkStatus>> {
        componentDidUpdate() {
          const nextProps = this.props;
          try {
            expect(nextProps.data).toBeDefined();
            expect(nextProps.data!.networkStatus.__typename).toEqual(
              'NetworkStatus'
            );
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

      render(
        <MockedProvider mocks={networkStatusMocks}>
          <ContainerWithData />
        </MockedProvider>
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

      const withProduct = graphql<
        ProductVariables,
        ProductData,
        ProductVariables
      >(productQuery, {
        options: props => ({
          variables: props
        })
      });

      const productVariables = { name: 'ACME 1' };
      const productMocks: MockedResponse[] = [
        {
          request: {
            query: productQuery,
            variables: productVariables
          },
          result: {
            data: {
              product: [
                {
                  __typename: 'Product',
                  name: 'ACME 1'
                }
              ]
            }
          }
        }
      ];

      class Container extends React.Component<
        ChildProps<ProductVariables, ProductData, ProductVariables>
      > {
        componentDidUpdate() {
          const nextProps = this.props;
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
          }
        }
      };

      render(
        <MockedProvider mocks={productMocks} resolvers={resolvers}>
          <ContainerWithData {...productVariables} />
        </MockedProvider>
      );
    }
  );
});
