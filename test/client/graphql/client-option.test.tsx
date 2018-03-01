import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../../src/test-utils';
import { ApolloProvider, graphql, ChildProps } from '../../../src';

import stripSymbols from '../../test-utils/stripSymbols';
import { DocumentNode } from 'graphql';

describe('client option', () => {
  it('renders with client from options', () => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

    type Data = typeof data;

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
    const ContainerWithData = graphql<{}, Data>(query, config)(() => null);
    renderer.create(
      <ApolloProvider
        client={
          new ApolloClient({
            link,
            cache: new Cache({ addTypename: false }),
          })
        }
      >
        <ContainerWithData />
      </ApolloProvider>,
    );
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
    type Data = typeof data;

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
    const ContainerWithData = graphql<{}, Data>(query, config)(() => null);
    shallow(<ContainerWithData />);
  });

  it('ignores client from context if client from options is present', done => {
    const query: DocumentNode = gql`
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

    type Data = typeof dataProvider;
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

    class Container extends React.Component<ChildProps<{}, Data>> {
      componentWillReceiveProps({ data }: ChildProps<{}, Data>) {
        expect(data!.loading).toBeFalsy(); // first data
        expect(stripSymbols(data!.allPeople)).toEqual({
          people: [{ name: 'Luke Skywalker' }],
        });
        done();
      }
      render() {
        return null;
      }
    }
    const ContainerWithData = graphql<{}, Data>(query, config)(Container);
    renderer.create(
      <ApolloProvider client={clientProvider}>
        <ContainerWithData />
      </ApolloProvider>,
    );
  });
  it('exposes refetch as part of the props api', done => {
    const query: DocumentNode = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const variables = { first: 1 };
    type Variables = typeof variables;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data1;

    const link = mockSingleLink({
      request: { query, variables },
      result: { data: data1 },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const Container = graphql<Variables, Data, Variables>(query)(
      class extends React.Component<ChildProps<Variables, Data, Variables>> {
        componentWillReceiveProps({ data }: ChildProps<Variables, Data, Variables>) {
          expect(data!.loading).toBeFalsy(); // first data
          done();
        }
        render() {
          return null;
        }
      },
    );

    renderer.create(
      <ApolloProvider client={client}>
        <Container first={1} />
      </ApolloProvider>,
    );
  });
});
