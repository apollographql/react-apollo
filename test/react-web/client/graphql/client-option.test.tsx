/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount, shallow } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { mockNetworkInterface } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('client option', () => {
  it('renders with client from options', () => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    const config = {
      options: {
        client,
      },
    };
    const ContainerWithData = graphql(query, config)(props => null);
    shallow(<ContainerWithData />);
  });

  it('ignores client from context if client from options is present', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const dataProvider = {
      allPeople: { people: [{ name: 'Leia Organa Solo' }] },
    };
    const networkInterfaceProvider = mockNetworkInterface({
      request: { query },
      result: { data: dataProvider },
    });
    const clientProvider = new ApolloClient({
      networkInterface: networkInterfaceProvider,
      addTypename: false,
    });
    const dataOptions = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterfaceOptions = mockNetworkInterface({
      request: { query },
      result: { data: dataOptions },
    });
    const clientOptions = new ApolloClient({
      networkInterface: networkInterfaceOptions,
      addTypename: false,
    });

    const config = {
      options: {
        client: clientOptions,
      },
    };

    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.loading).toBe(false); // first data
        expect(data.allPeople).toMatchObject({
          people: [{ name: 'Luke Skywalker' }],
        });
        done();
      }
      render() {
        return null;
      }
    }
    const ContainerWithData = graphql(query, config)(Container);
    renderer.create(
      <ApolloProvider client={clientProvider}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });
  it('exposes refetch as part of the props api', done => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const variables = { first: 1 };
    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query, variables },
      result: { data: data1 },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    let hasRefetched,
      count = 0;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.loading).toBe(false); // first data
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>,
    );
  });
});
