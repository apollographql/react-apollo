import { StyleSheet, Text, View } from 'react-native';
import React, { Component } from 'react';

// import { mount, shallow } from 'enzyme';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import { ApolloProvider, graphql } from '../../src';
import { mockSingleLink } from '../../src/test-utils';

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
    const data = { allPeople: { people: { name: 'Luke Skywalker' } } };
    const link = mockSingleLink({ request: { query }, result: { data } });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const ContainerWithData = graphql(query)(({ data }) => {
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
    const data = { allPeople: { people: { name: 'Luke Skywalker' } } };
    const link = mockSingleLink({ request: { query }, result: { data } });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    class Container extends Component {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBeFalsy();
        expect(props.data.allPeople.people.name).toEqual(
          data.allPeople.people.name,
        );
        done();
      }
      render() {
        if (this.props.data.loading) return <Text>Loading...</Text>;
        return <Text>{this.props.data.allPeople.people.name}</Text>;
      }
    }

    const ContainerWithData = graphql(query)(Container);

    const output = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });
});
