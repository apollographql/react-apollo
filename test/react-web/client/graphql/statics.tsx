
import * as React from 'react';
import * as chai from 'chai';
import gql from 'graphql-tag';

const { expect } = chai;

import graphql from '../../../../src/graphql';

let sampleOperation = gql`{ user { name } }`;

describe('statics', () => {
  it('should be preserved', () => {
    @graphql(sampleOperation)
    class ApolloContainer extends React.Component<any, any> {
      static veryStatic = 'such global';
    };

    expect(ApolloContainer.veryStatic).to.eq('such global');
  });

  it('exposes a debuggable displayName', () => {
    @graphql(sampleOperation)
    class ApolloContainer extends React.Component<any, any> {}

    expect((ApolloContainer as any).displayName).to.eq('Apollo(ApolloContainer)');
  });

  it('honors custom display names', () => {
    @graphql(sampleOperation)
    class ApolloContainer extends React.Component<any, any> {
      static displayName = 'Foo';
    }

    expect((ApolloContainer as any).displayName).to.eq('Apollo(Foo)');
  });
});
