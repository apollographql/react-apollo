/*
  XXX

  When this test is included with the other shared operations tests,
  an error is thrown concerning calling `injectEnvironment` more than once.
  This is due to `react-test-renderer` and `TestUtils` being used in
  the same file. We can move this back in once React 15.4 is released,
  which should have a fix for it.

  https://github.com/facebook/react/issues/7386
*/

import * as React from 'react';
import gql from 'graphql-tag';

const TestUtils = require('react-addons-test-utils');

import ApolloClient from 'apollo-client';

declare function require(name: string);

import { mockNetworkInterface } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('shared operations', () => {
  it('allows a way to access the wrapped component instance', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const testData = { foo: 'bar' };

    class Container extends React.Component<any, any> {
      someMethod() {
        return testData;
      }

      render() {
        return <span></span>;
      }
    }

    const Decorated = graphql(query, { withRef: true })(Container);

    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider client={client}>
        <Decorated />
      </ApolloProvider>
    ) as any;

    const decorated = TestUtils.findRenderedComponentWithType(tree, Decorated);

    expect(() => (decorated as any).someMethod()).toThrow();
    expect((decorated as any).getWrappedInstance().someMethod()).toEqual(testData);
    expect((decorated as any).refs.wrappedInstance.someMethod()).toEqual(testData);

  });
});
