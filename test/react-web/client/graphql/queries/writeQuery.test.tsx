/// <reference types="jest" />

import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import Cache from 'apollo-cache-inmemory';

import { mockSingleLink } from '../../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../../src';

describe('[queries] writeQuery', () => {
  it('exposes writeQuery as part of the props api', done => {
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

    @graphql(query, { options: { fetchPolicy: 'cache-only' } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.writeQuery).toBeTruthy();
        expect(data.writeQuery instanceof Function).toBe(true);

        try {
          data.writeQuery({ query, data });
          done();
        } catch (err) {
          // fail
        }
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('exposes writeQuery as part of the props api during componentWillMount', done => {
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
    const link = mockSingleLink({ request: { query }, result: { data } });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, { options: { fetchPolicy: 'cache-only' } })
    class Container extends React.Component<any, any> {
      componentWillMount() {
        // tslint:disable-line
        expect(this.props.data.writeQuery).toBeTruthy();
        expect(this.props.data.writeQuery instanceof Function).toBe(true);
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('writeQuery properly writes the query to the cache', done => {
    const query = gql`
      {
        todo(id: 2) {
          name
        }
      }
    `;

    const data = { todo: { name: 'write more tests' } };
    const link = mockSingleLink({ request: { query }, result: { data } });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query, { options: { fetchPolicy: 'cache-only' } })
    class QueryWriter extends React.Component<any, any> {
      componentDidMount() {
        // tslint:disable-line
        const { data } = this.props;
        try {
          data.writeQuery({ query, data });
        } catch (err) {
          // fail
        }
      }
      render() {
        return <QueryReader />;
      }
    }

    @graphql(query, { options: { fetchPolicy: 'cache-only' } })
    class QueryReader extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        // tslint:disable-line
        if (!props.loading) {
          expect(props.data.todo).toEqual(data.todo);
        }
        done();
        return;
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <QueryWriter />
      </ApolloProvider>,
    );
  });
});
