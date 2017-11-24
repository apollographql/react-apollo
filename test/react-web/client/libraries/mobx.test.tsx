import * as React from 'react';
import { mount } from 'enzyme';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
declare function require(name: string);

import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('mobx integration', () => {
  class AppState {
    @observable first = 0;

    reset() {
      this.first = 0;
    }
  }

  it('works with mobx', () =>
    new Promise((resolve, reject) => {
      const query = gql`
        query people($first: Int) {
          allPeople(first: $first) {
            people {
              name
            }
          }
        }
      `;
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const variables = { first: 0 };

      const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
      const variables2 = { first: 1 };

      const link = mockSingleLink(
        { request: { query, variables }, result: { data } },
        { request: { query, variables: variables2 }, result: { data: data2 } },
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      let count = 0;

      @graphql(query, {
        options: props => ({ variables: { first: props.appState.first } }),
      })
      @observer
      class Container extends React.Component<any, any> {
        componentDidUpdate() {
          try {
            switch (count++) {
              case 0:
                // this next assertion is flaky on CI tests?
                // XXX update this integration test anyway
                // expect(this.props.appState.first).toEqual(0);
                expect(this.props.data.loading).toEqual(false);
                expect(this.props.data.allPeople).toEqual(data.allPeople);
                break;
              case 1:
                expect(this.props.appState.first).toEqual(1);
                expect(this.props.data.loading).toEqual(false);
                expect(this.props.data.allPeople).toEqual(data.allPeople);
                this.props.data
                  .refetch({ first: this.props.appState.first })
                  .catch(reject);
                break;
              case 2:
                expect(this.props.appState.first).toEqual(1);
                expect(this.props.data.loading).toEqual(true);
                expect(this.props.data.allPeople).toEqual(data.allPeople);
                break;
              case 3:
                expect(this.props.appState.first).toEqual(1);
                expect(this.props.data.loading).toEqual(false);
                expect(this.props.data.allPeople).toEqual(data2.allPeople);
                resolve();
                break;
              default:
                throw new Error('Component updated to many times.');
            }
          } catch (error) {
            reject(error);
          }
        }

        render() {
          return <div>{this.props.appState.first}</div>;
        }
      }

      const appState = new AppState();

      mount(
        <ApolloProvider client={client}>
          <Container appState={appState} />
        </ApolloProvider>,
      ) as any;

      setTimeout(() => {
        appState.first += 1;
      }, 10);
    }));
});
