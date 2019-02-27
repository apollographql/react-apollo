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
