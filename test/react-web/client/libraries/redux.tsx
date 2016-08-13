
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { connect } from 'react-redux';
import { reducer as formReducer, reduxForm } from 'redux-form';
import { combineReducers as loopCombine, install } from 'redux-loop';
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

  describe('redux-form', () => {
    it('works with redux form to drive queries', (done) => {
      const query = gql`query people($name: String) { allPeople(name: $name) { people { name } } }`;
      const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
      const variables = { name: 'Luke' };

      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data } }
      );

      const client = new ApolloClient({ networkInterface });
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
      @graphql(query, {
        options: ({ fields }) => ({
          variables: { name: fields.firstName.value },
          skip: !fields.firstName.value,
        }),
      })
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          const { value } = nextProps.fields.firstName;
          if (!value) return;

          expect(value).to.equal(variables.name);
          if (nextProps.data.loading) return;

          expect(nextProps.data.loading).to.be.false;
          expect(nextProps.data.allPeople).to.deep.equal(data.allPeople);
          done();
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

    it('works with redux form to be prefilled by queries', (done) => {
      const query = gql`query people($name: String) { allPeople(name: $name) { people { name } } }`;
      const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
      const variables = { name: 'Luke' };

      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data } }
      );

      const client = new ApolloClient({ networkInterface });
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

          expect(initialValue).to.equal(data.allPeople.people[0].name);
          expect(value).to.equal(data.allPeople.people[0].name);

          done();
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

      mount(
        <ProviderMock store={store} client={client}>
          <Container />
        </ProviderMock>
      ) as any;

    });
  });

  describe('redux-loop', () => {
    it('works with redux-loop', (done) => {
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
});
