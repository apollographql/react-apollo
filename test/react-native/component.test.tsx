import { Text } from 'react-native';
import * as React from 'react';
// Note: test renderer must be required after react-native.
import * as renderer from 'react-test-renderer';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import { ApolloProvider, ChildProps, graphql } from '../../src';
import { mockSingleLink } from '../../src/test-utils';
import '../test-utils/toEqualJson';

describe('App', () => {
  it('renders correctly', () => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;

    interface Data {
      allPeople: { people: { name: string } };
    }
    const link = mockSingleLink({
      request: { query },
      result: { data: { allPeople: { people: { name: 'Luke Skywalker' } } } },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const ContainerWithData = graphql(
      query,
    )(({ data }: ChildProps<{}, Data>) => {
      if (data.loading) return <Text>Loading...</Text>;
      return <Text>{data.allPeople.people.name}</Text>;
    });
    const output = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    expect(output.toJSON()).toMatchSnapshot();
  });

  it('executes a query', done => {
    jest.useRealTimers();
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    interface Data {
      allPeople: { people: { name: string } };
    }
    const data1 = { allPeople: { people: { name: 'Luke Skywalker' } } };
    const link = mockSingleLink({
      request: { query },
      result: { data: data1 },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    class Container extends React.Component<ChildProps<{}, Data>> {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBeFalsy();
        expect(props.data.allPeople.people.name).toEqualJson(
          data1.allPeople.people.name,
        );
        done();
      }
      render() {
        if (this.props.data.loading) return <Text>Loading...</Text>;
        return <Text>{this.props.data.allPeople.people.name}</Text>;
      }
    }

    const ContainerWithData = graphql(query)(Container);

    renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });
});
