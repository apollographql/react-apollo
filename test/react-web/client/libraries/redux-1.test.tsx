
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { connect } from 'react-redux';
import { reducer as formReducer, reduxForm } from 'redux-form';
import { combineReducers as loopCombine, install } from 'redux-loop';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);

import {
  ProviderMock,
} from '../../../mocks/components';
import mockNetworkInterface from '../../../mocks/mockNetworkInterface';


import { graphql } from '../../../../src';

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
          expect(nextProps.data.allPeople).toEqual(data2.allPeople);
          done();
          wrapper.unmount();
        }
      }
      render() {
        return null;
      }
    };

    wrapper = renderer.create(
      <ProviderMock store={store} client={client}>
        <Container />
      </ProviderMock>
    ) as any;

  });

  describe('redux-form', () => {
    // XXX reinsert `redux-2.test.tsx`
    it('works with redux form to be prefilled by queries', (done) => {
      const query = gql`query people($name: String) { allPeople(name: $name) { people { name } } }`;
      const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
      const variables = { name: 'Luke' };

      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data } }
      );

      const client = new ApolloClient({ networkInterface });

      // Typscript workaround
      const apolloReducer = client.reducer() as () => any;

      const store = createStore(
        combineReducers({
          apollo: apolloReducer,
          form: formReducer,
        }),
        applyMiddleware(client.middleware())
      );

      @graphql(query, { options: () => ({ variables }) })
      @reduxForm({
        form: 'contact',
        fields: ['firstName'],
      }, (state, ownProps) => ({
        initialValues: {
          firstName: ownProps.data.loading ? '' : ownProps.data.allPeople.people[0].name,
        },
      }))
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          const { value, initialValue } = nextProps.fields.firstName;
          if (!value) return;

          expect(initialValue).toBe(data.allPeople.people[0].name);
          expect(value).toBe(data.allPeople.people[0].name);

          done();
          // wrapper.unmount();
        }

        render() {
          const { fields: { firstName }, handleSubmit } = this.props;
          return (
            <form onSubmit={handleSubmit}>
              <div>
                <label>First Name</label>
                <input type='text' placeholder='First Name' {...firstName}/>
              </div>
              <button type='submit'>Submit</button>
            </form>
          );
        }
      };

      renderer.create(
        <ProviderMock store={store} client={client}>
          <Container />
        </ProviderMock>
      ) as any;

    });
  });

  describe('redux-loop', () => {
    it('works with redux-loop with shared store', (done) => {
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
        loopCombine({
          counter,
          apollo: apolloReducer,
        }),
        applyMiddleware(client.middleware()),
        install()
      );

      @connect((state) => ({ first: state.counter }))
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

      wrapper = renderer.create(
        <ProviderMock store={store} client={client}>
          <Container />
        </ProviderMock>
      ) as any;
    });
  });


});
