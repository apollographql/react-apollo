/*
  XXX

  When these tests are included with the other redux tests,
  an error is thrown concerning calling `injectEnvironment` more than once.
  This is due to `react-test-renderer` and `mount` being used in
  the same file. We can move this back in once React 15.4 is released,
  which should have a fix for it.

  https://github.com/facebook/react/issues/7386
*/

import * as React from 'react';
import { mount } from 'enzyme';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { connect } from 'react-redux';
import {
  reducer as formReducer,
  reduxForm,
  formValueSelector,
  Field
} from 'redux-form';
import gql from 'graphql-tag';
import { combineReducers as loopCombine, install } from 'redux-loop';
import { Map } from 'immutable';
import { combineReducers as combineImmutable } from 'redux-immutable';

import ApolloClient from 'apollo-client';

declare function require(name: string);

import {
  ProviderMock,
} from '../../../mocks/components';
import mockNetworkInterface from '../../../mocks/mockNetworkInterface';


import { ApolloProvider, graphql } from '../../../../src';

describe('redux integration', () => {
  describe('redux-form', () => {
    it('works with redux form to drive queries', (done) => {
      const query = gql`query people($name: String) { allPeople(name: $name) { people { name } } }`;
      const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
      const variables = { name: 'Luke' };

      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data } }
      );

      const client = new ApolloClient({ networkInterface, addTypename: false });
      let wrapper;

      // Typscript workaround
      const apolloReducer = client.reducer() as () => any;

      const store = createStore(
        combineReducers({
          apollo: apolloReducer,
          form: formReducer,
        }),
        applyMiddleware(client.middleware())
      );

      @reduxForm({
        form: 'contact',
        fields: ['firstName'],
      })
      @connect((state) => ({
        firstName: formValueSelector('contact')(state, 'firstName'),
      }))
      @graphql(query, {
        options: ({ firstName }) => ({
          variables: { name: firstName },
          skip: !firstName,
        }),
      })
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          const { firstName } = nextProps;
          if (!firstName) return;

          expect(firstName).toBe(variables.name);
          if (nextProps.data.loading || !nextProps.data.allPeople) return;

          expect(nextProps.data.loading).toBe(false);
          expect(nextProps.data.allPeople).toEqual(data.allPeople);
          done();
          wrapper.unmount();
        }

        render() {
          const { firstName, handleSubmit } = this.props;
          // changed from {...firstName} to prevent unknown prop warnings
          return (
            <form onSubmit={handleSubmit}>
              <div>
                <label>First Name</label>
                <Field name="firstName" component="input" type="text" placeholder="First Name" />
              </div>
              <button type='submit'>Submit</button>
            </form>
          );
        }
      };

      wrapper = mount(
        <ProviderMock store={store} client={client}>
          <Container />
        </ProviderMock>
      ) as any;

      setTimeout(() => {
        wrapper.find('input').simulate('change', {
          target: { value: variables.name },
        });
      }, 100);

    });
  });

  describe('redux-loop', () => {
    it('works with redux-loop and an immutable store', (done) => {
      const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
      const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
      const variables = { first: 1 };

      const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
      const variables2 = { first: 2 };

      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data } },
        { request: { query, variables: variables2 }, result: { data: data2 } }
      );

      const client = new ApolloClient({ networkInterface, addTypename: false });
      let wrapper;

      function counter(state = 1, action) {
        switch (action.type) {
          case 'INCREMENT':
            return state + 1;
          default:
            return state;
          }
      }

      // initial state, accessor and mutator for supporting root-level
      // immutable data with redux-loop reducer combinator
      const immutableStateContainer = Map();
      const getImmutable = (child, key) => child ? child.get(key) : void 0;
      const setImmutable = (child, key, value) => child.set(key, value);

      const store = createStore(
        loopCombine({
          counter,
        }, immutableStateContainer as any, getImmutable, setImmutable),
        install()
      );

      @connect((state) => ({ first: state.get('counter') }))
      @graphql(query)
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
          if (nextProps.first === 2) {
            if (nextProps.data.loading) return;
            expect(nextProps.data.allPeople).toEqual(data2.allPeople);
            done();
            wrapper.unmount();
          }
        }
        render() {
          return null;
        }
      };

      wrapper = mount(
        <ApolloProvider store={store} client={client} immutable={true}>
          <Container />
        </ApolloProvider>
      ) as any;
    });
  });

  describe('immutable store', () => {
    it('works an immutable store', (done) => {
      const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
      const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
      const variables = { first: 1 };

      const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
      const variables2 = { first: 2 };

      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data } },
        { request: { query, variables: variables2 }, result: { data: data2 } }
      );

      const client = new ApolloClient({ networkInterface, addTypename: false });
      let wrapper;

      function counter(state = 1, action) {
        switch (action.type) {
          case 'INCREMENT':
            return state + 1;
          default:
            return state;
          }
      }

      // initial state, accessor and mutator for supporting root-level
      // immutable data with redux-loop reducer combinator
      const initialState = Map();

      const store = createStore(combineImmutable({ counter }), initialState);

      @connect((state) => ({ first: state.get('counter') }))
      @graphql(query)
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
          if (nextProps.first === 2) {
            if (nextProps.data.loading) return;
            expect(nextProps.data.allPeople).toEqual(data2.allPeople);
            done();
            wrapper.unmount();
          }
        }
        render() {
          return null;
        }
      };

      wrapper = mount(
        <ApolloProvider store={store} client={client} immutable={true}>
          <Container />
        </ApolloProvider>
      ) as any;
    });
  });

});
