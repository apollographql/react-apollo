import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { mount, shallow } from 'enzyme';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { connect, Provider } from 'react-redux';
import {
  reducer as formReducer,
  reduxForm,
  formValueSelector,
  Field,
} from 'redux-form';
import { combineReducers as loopCombine, install } from 'redux-loop';
import { Map } from 'immutable';
import { combineReducers as combineImmutable } from 'redux-immutable';
import gql from 'graphql-tag';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

import ApolloClient from 'apollo-client';

declare function require(name: string);

import { mockSingleLink } from '../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../src';

describe('redux integration', () => {
  it('updates child props on state change', done => {
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    const link = mockSingleLink(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
    );

    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });
    let wrapper;

    function counter(state = 1, action) {
      switch (action.type) {
        case 'INCREMENT':
          return state + 1;
        default:
          return state;
      }
    }

    const store = createStore(
      combineReducers({
        counter,
      }),
    );

    @connect(state => ({ first: state.counter }))
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(nextProps) {
        if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
        if (nextProps.first === 2) {
          if (nextProps.data.loading) return;
          expect(nextProps.data.allPeople).toEqual(data2.allPeople);
          done();
          //wrapper.unmount();
        }
      }
      render() {
        return null;
      }
    }

    wrapper = renderer.create(
      <Provider store={store}>
        <ApolloProvider client={client}>
          <Container />
        </ApolloProvider>
      </Provider>,
    ) as any;
  });

  describe('redux-form', () => {
    it('works with redux form to be prefilled by queries', done => {
      const query = gql`
        query people($name: String) {
          allPeople(name: $name) {
            people {
              name
            }
          }
        }
      `;
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const variables = { name: 'Luke' };

      const link = mockSingleLink({
        request: { query, variables },
        result: { data },
      });

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const store = createStore(
        combineReducers({
          form: formReducer,
        }),
      );

      function MyField({ input: { value } }) {
        if (!value) return null;

        expect(value).toBe(data.allPeople.people[0].name);

        done();
        // wrapper.unmount();
        return null;
      }

      @graphql(query, {
        options: () => ({ variables }),
        props: ({ data: { loading, allPeople } }) => ({
          initialValues: {
            firstName: loading ? '' : allPeople.people[0].name,
          },
        }),
      })
      @reduxForm({
        form: 'contact',
        fields: ['firstName'],
        enableReinitialize: true,
      })
      class Container extends React.Component<any, any> {
        render() {
          const { fields: { firstName }, handleSubmit } = this.props;
          return (
            <form onSubmit={handleSubmit}>
              <div>
                <label>First Name</label>
                <Field name="firstName" component={MyField} />
              </div>
              <button type="submit">Submit</button>
            </form>
          );
        }
      }

      mount(
        <Provider store={store}>
          <ApolloProvider client={client}>
            <Container />
          </ApolloProvider>
        </Provider>,
      ) as any;
    });
  });

  describe('redux-loop', () => {
    it('works with redux-loop and an immutable store', done => {
      const query = gql`
        query people($first: Int) {
          allPeople(first: $first) {
            people {
              name
            }
          }
        }
      `;
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const variables = { first: 1 };

      const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
      const variables2 = { first: 2 };

      const link = mockSingleLink(
        { request: { query, variables }, result: { data } },
        { request: { query, variables: variables2 }, result: { data: data2 } },
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });
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
      const getImmutable = (child, key) => (child ? child.get(key) : void 0);
      const setImmutable = (child, key, value) => child.set(key, value);

      const store = createStore(
        loopCombine(
          {
            counter,
          },
          immutableStateContainer as any,
          getImmutable,
          setImmutable,
        ),
        install(),
      );

      @connect(state => ({ first: state.get('counter') }))
      @graphql(query)
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
          if (nextProps.first === 2) {
            if (nextProps.data.loading) return;
            expect(nextProps.data.allPeople).toEqual(data2.allPeople);
            done();
            //wrapper.unmount();
          }
        }
        render() {
          return null;
        }
      }

      wrapper = renderer.create(
        <Provider store={store}>
          <ApolloProvider client={client}>
            <Container />
          </ApolloProvider>
        </Provider>,
      ) as any;
    });

    it('works with redux-loop with shared store', done => {
      const query = gql`
        query people($first: Int) {
          allPeople(first: $first) {
            people {
              name
            }
          }
        }
      `;
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const variables = { first: 1 };

      const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
      const variables2 = { first: 2 };

      const link = mockSingleLink(
        { request: { query, variables }, result: { data } },
        { request: { query, variables: variables2 }, result: { data: data2 } },
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });
      let wrapper;

      function counter(state = 1, action) {
        switch (action.type) {
          case 'INCREMENT':
            return state + 1;
          default:
            return state;
        }
      }

      const store = createStore(
        loopCombine({
          counter,
        }),
        install(),
      );

      @connect(state => ({ first: state.counter }))
      @graphql(query)
      class Container extends React.Component<any, any> {
        componentWillReceiveProps(nextProps) {
          if (nextProps.first === 1) this.props.dispatch({ type: 'INCREMENT' });
          if (nextProps.first === 2) {
            if (nextProps.data.loading) return;
            expect(nextProps.data.allPeople).toEqual(data2.allPeople);
            done();
            //wrapper.unmount();
          }
        }
        render() {
          return null;
        }
      }

      wrapper = renderer.create(
        <Provider store={store}>
          <ApolloProvider client={client}>
            <Container />
          </ApolloProvider>
        </Provider>,
      ) as any;
    });
  });

  describe('immutable store', () => {
    it('works an immutable store', done => {
      const query = gql`
        query people($first: Int) {
          allPeople(first: $first) {
            people {
              name
            }
          }
        }
      `;
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const variables = { first: 1 };

      const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
      const variables2 = { first: 2 };

      const link = mockSingleLink(
        { request: { query, variables }, result: { data } },
        { request: { query, variables: variables2 }, result: { data: data2 } },
      );

      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });
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

      @connect(state => ({ first: state.get('counter') }))
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
      }

      wrapper = mount(
        <Provider store={store}>
          <ApolloProvider client={client}>
            <Container />
          </ApolloProvider>
        </Provider>,
      ) as any;
    });
  });
});

// placing this inside the root describe, or the redux form describe
// passes, but with lots of invarient warnings
it('works with redux form to drive queries', done => {
  const query = gql`
    query people($name: String) {
      allPeople(name: $name) {
        people {
          name
        }
      }
    }
  `;
  const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
  const variables = { name: 'Luke' };

  const link = mockSingleLink({
    request: { query, variables },
    result: { data },
  });

  const client = new ApolloClient({
    link,
    cache: new Cache({ addTypename: false }),
  });
  let wrapper;

  const store = createStore(
    combineReducers({
      form: formReducer,
    }),
  );

  @reduxForm({
    form: 'contact',
    fields: ['firstName'],
  })
  @connect(state => ({
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
            <Field
              name="firstName"
              component="input"
              type="text"
              placeholder="First Name"
            />
          </div>
          <button type="submit">Submit</button>
        </form>
      );
    }
  }

  wrapper = mount(
    <Provider store={store}>
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    </Provider>,
  ) as any;

  setTimeout(() => {
    wrapper.find('input').simulate('change', {
      target: { value: variables.name },
    });
  }, 100);
});
