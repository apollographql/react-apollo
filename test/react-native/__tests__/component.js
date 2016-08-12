// __tests__/Intro-test.js
import 'react-native';
import React from 'react';
import Component from '../component';
// import { mount, shallow } from 'enzyme';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import { ApolloProvider, graphql } from '../../../lib/src';
import mockNetworkInterface from '../../../lib/test/mocks/mockNetworkInterface';

describe('App', () => {

  it('renders correctly', () => {
    const query = gql`query people { allPeople(first: 1) { people { name } } }`;
    const data = { allPeople: { people: { name: 'Luke Skywalker' } } };
    const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
    const client = new ApolloClient({ networkInterface });

    const tree = renderer.create(
      <ApolloProvider client={client}><Component /></ApolloProvider>
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  // it('renders correctly with data', () => {
  //   const ContainerWithData =  graphql(query)(({ data }) => { // tslint:disable-line
  //     expect(data).to.exist;
  //     expect(data.ownProps).to.not.exist;
  //     expect(data.loading).to.be.true;
  //     return null;
  //   });

  //   const wrapper = mount(<ApolloProvider client={client}><ContainerWithData /></ApolloProvider>);
  //   wrapper.unmount();
  // });

});
