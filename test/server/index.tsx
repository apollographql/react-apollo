import * as chai from 'chai';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { connect, ApolloProvider, getData } from '../../src';
import 'isomorphic-fetch';

// Globally register gql template literal tag
import gql from 'graphql-tag';

import mockNetworkInterface from '../mocks/mockNetworkInterface';

const { expect } = chai;

const client = new ApolloClient({
  networkInterface: createNetworkInterface('https://www.graphqlhub.com/playground')
});

describe('SSR', () => {
  it('should render the expected markup', (done) => {
    const Element = ({ data }) => {
      return <div>{data.loading ? 'loading' : 'loaded'}</div>;
    }

    const WrappedElement = connect({
      mapQueriesToProps: ({ ownProps }) => ({
        data: {
          query: gql`
            query Feed {
              currentUser {
                login
              }
            }
          `
        }
      })
    })(Element);

    const component = (
      <ApolloProvider client={client}>
        <WrappedElement />
      </ApolloProvider>
    );

    try {
      const data = ReactDOM.renderToString(component);
      expect(data).to.match(/loading/);
      // We do a timeout to ensure the rest of the application does not fail
      // after the render
      setTimeout(() => {
        done();
      }, 1000);
    } catch (e) {
      done(e);
    }
  });

  describe('`getData`', () => {
    it('should run through all of the queries that want SSR', (done) => {
      const Element = ({ data }) => {
        return <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>;
      };

      const query = gql`
        query App {
          currentUser {
            firstName
          }
        }
      `;

      const data = {
        currentUser: {
          firstName: 'James',
        },
      };

      const networkInterface = mockNetworkInterface(
        {
          request: { query },
          result: { data },
          delay: 50,
        }
      );

      const client = new ApolloClient({
        networkInterface,
      });

      const WrappedElement = connect({
        mapQueriesToProps: () => ({
          data: {
            query,
            ssr: true, // block during SSR render
          },
        })
      })(Element);

      const app = (
        <ApolloProvider client={client}>
          <WrappedElement />
        </ApolloProvider>
      );

      getData(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).to.match(/James/);
          done();
        });
    });
  });
});
