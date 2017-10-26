/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount, shallow } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';
import { ObservableQueryRecycler } from '../../../../src/queryRecycler';

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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    const config = {
      options: {
        client,
      },
    };
    const ContainerWithData = graphql(query, config)(props => null);
    shallow(<ContainerWithData />, {
      context: { getQueryRecycler: () => new ObservableQueryRecycler() },
    });
  });
  it('doesnt require a recycler', () => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
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
    const linkProvider = mockSingleLink({
      request: { query },
      result: { data: dataProvider },
    });
    const clientProvider = new ApolloClient({
      link: linkProvider,
      cache: new Cache({ addTypename: false }),
    });
    const dataOptions = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const linkOptions = mockSingleLink({
      request: { query },
      result: { data: dataOptions },
    });
    const clientOptions = new ApolloClient({
      link: linkOptions,
      cache: new Cache({ addTypename: false }),
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

  it('uses client in context if options.client is a string', done => {
    const query1 = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data1 = {
      allPeople: { people: [{ name: 'Leia Organa Solo' }] },
    };
    const link1 = mockSingleLink({
      request: { query: query1 },
      result: { data: data1 },
    });
    const client1 = new ApolloClient({
      link: link1,
      cache: new Cache({ addTypename: false }),
    });

    const query2 = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data2 = {
      allPeople: { people: [{ name: 'Luke Skywalker' }] },
    };
    const link2 = mockSingleLink({
      request: { query: query2 },
      result: { data: data2 },
    });
    const client2 = new ApolloClient({
      link: link2,
      cache: new Cache({ addTypename: false }),
    });

    const config = {
      options: {
        client: 'client2',
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
    const ContainerWithData = graphql(query2, config)(Container);
    renderer.create(
      <ApolloProvider clients={{ client1, client2 }} defaultClient={client1}>
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
    const link = mockSingleLink({
      request: { query, variables },
      result: { data: data1 },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

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
