import * as chai from 'chai';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { connect, ApolloProvider } from '../../src';
import 'isomorphic-fetch';

// Globally register gql template literal tag
import gql from 'apollo-client/gql';

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
});
