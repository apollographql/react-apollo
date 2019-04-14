import React from 'react';
import ReactDOM from 'react-dom/server';
import ApolloClient from 'apollo-client';
import {
  Query,
  ApolloProvider,
  getDataFromTree,
  getApolloContext,
} from '../../';
import gql from 'graphql-tag';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '@apollo/react-testing';
import { DocumentNode } from 'graphql';

describe('SSR', () => {
  describe('`getDataFromTree`', () => {
    it('should support passing a root context', () => {
      class Consumer extends React.Component {
        static contextType = getApolloContext();

        render() {
          return <div>{this.context.text}</div>;
        }
      }

      return getDataFromTree(<Consumer />, {
        text: 'oyez',
      }).then(html => {
        expect(html).toEqual('<div>oyez</div>');
      });
    });

    it('should run through all of the queries (also defined via Query component) that want SSR', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const data1 = { currentUser: { firstName: 'James' } };
      const link = mockSingleLink({
        request: { query },
        result: { data: data1 },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Data {
        currentUser?: {
          firstName: string;
        };
      }

      class CurrentUserQuery extends Query<Data> {}

      const WrappedElement = () => (
        <CurrentUserQuery query={query}>
          {({ data, loading }) => (
            <div>
              {loading || !data ? 'loading' : data.currentUser!.firstName}
            </div>
          )}
        </CurrentUserQuery>
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should pass any GraphQL errors in props along with data during a SSR when errorPolicy="all"', done => {
      const query: DocumentNode = gql`
        query people {
          allPeople {
            people {
              name
            }
          }
        }
      `;
      const link = mockSingleLink({
        request: { query },
        result: {
          data: {
            allPeople: {
              people: null,
            },
          },
          errors: [new Error('this is an error')],
        },
      });

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const app = (
        <ApolloProvider client={client}>
          <Query query={query} errorPolicy="all">
            {({ data, error }: any) => {
              expect(data).toMatchObject({ allPeople: { people: null } });
              expect(error).toBeDefined();
              expect(error.graphQLErrors[0].message).toEqual(
                'this is an error',
              );
              done();
              return null;
            }}
          </Query>
        </ApolloProvider>
      );

      getDataFromTree(app);
    });
  });
});
