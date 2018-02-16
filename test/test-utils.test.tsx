import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';

import { graphql, ChildProps } from '../src';
import { MockedProvider, mockSingleLink } from '../src/test-utils';
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
      __typename
    }
  }
`;
const queryWithoutTypename: DocumentNode = gql`
  query GetUser($username: String!) {
    user(username: $username) {
      id
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

const withUser = graphql<Variables, Data, Variables>(queryWithoutTypename, {
  options: props => ({
    variables: props,
  }),
});

it('mocks the data and adds the typename to the query', done => {
  class Container extends React.Component<
    ChildProps<Variables, Data, Variables>
  > {
    componentWillReceiveProps(
      nextProps: ChildProps<Variables, Data, Variables>,
    ) {
      try {
        expect(nextProps.data!.user).toMatchSnapshot();
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

  const mocks = [
    {
      request: {
        query,
        variables,
      },
      result: { data: { user } },
    },
  ];

  renderer.create(
    <MockedProvider mocks={mocks}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('errors if the variables in the mock and component do not match', done => {
  class Container extends React.Component<
    ChildProps<Variables, Data, Variables>
  > {
    componentWillReceiveProps(
      nextProps: ChildProps<Variables, Data, Variables>,
    ) {
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

  const mocks = [
    {
      request: {
        query,
        variables,
      },
      result: { data: { user } },
    },
  ];

  const variables2 = {
    username: 'other_user',
  };

  renderer.create(
    <MockedProvider mocks={mocks}>
      <ContainerWithData {...variables2} />
    </MockedProvider>,
  );
});

it('mocks a network error', done => {
  class Container extends React.Component<
    ChildProps<Variables, Data, Variables>
  > {
    componentWillReceiveProps(
      nextProps: ChildProps<Variables, Data, Variables>,
    ) {
      try {
        expect(nextProps.data!.error).toEqual(
          new Error('Network error: something went wrong'),
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

  const mocks = [
    {
      request: {
        query,
        variables,
      },
      error: new Error('something went wrong'),
    },
  ];

  renderer.create(
    <MockedProvider mocks={mocks}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('mocks the data without adding the typename', done => {
  class Container extends React.Component<
    ChildProps<Variables, Data, Variables>
  > {
    componentWillReceiveProps(
      nextProps: ChildProps<Variables, Data, Variables>,
    ) {
      try {
        expect(nextProps.data!.user).toMatchSnapshot();
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

  const mocks = [
    {
      request: {
        query: queryWithoutTypename,
        variables,
      },
      result: { data: { user: userWithoutTypeName } },
    },
  ];

  renderer.create(
    <MockedProvider mocks={mocks} removeTypename>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});

it('allows for passing a custom client', done => {
  const link = mockSingleLink({
    request: {
      query,
      variables,
    },
    result: { data: { user } },
  });
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });

  class Container extends React.Component<
    ChildProps<Variables, Data, Variables>
  > {
    componentWillReceiveProps(
      nextProps: ChildProps<Variables, Data, Variables>,
    ) {
      try {
        expect(nextProps.data!.user).toMatchSnapshot();
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

  renderer.create(
    <MockedProvider client={client}>
      <ContainerWithData {...variables} />
    </MockedProvider>,
  );
});
