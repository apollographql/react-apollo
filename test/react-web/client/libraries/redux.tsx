
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { connect } from 'react-redux';
// import assign = require('object-assign');
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import {
  ProviderMock,
} from '../../../mocks/components';
import mockNetworkInterface from '../../../mocks/mockNetworkInterface';


import graphql from '../../../../src/graphql';

describe('redux integration', () => {

  it('updates child props on state change', (done) => {
    const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 1 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface });
    let wrapper;

    function counter(state = 1, action) {
      switch (action.type) {
        case 'INCREMENT':
          return state + 1;
        default:
          return state;
        }
    }

    // Typscript workaround
    const apolloReducer = client.reducer() as () => any;

    const store = createStore(
      combineReducers({
        counter,
        apollo: apolloReducer,
      }),
      applyMiddleware(client.middleware())
    );

    @connect((state) => ({ first: state.counter }))
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(nextProps) {
        if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
        if (nextProps.first === 2) {
          if (nextProps.data.loading) return;
          expect(nextProps.data.allPeople).to.deep.equal(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    };

    wrapper = mount(
      <ProviderMock store={store} client={client}>
        <Container />
      </ProviderMock>
    ) as any;

  });

});
