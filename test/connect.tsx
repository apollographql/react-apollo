/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { connect as ReactReduxConnect } from 'react-redux';
import assign = require('object-assign');
// import { spy } from 'sinon';

import {
  GraphQLResult,
  parse,
  print,
} from 'graphql';

import ApolloClient from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import connect from '../src/connect';

describe('connect', () => {

  class Passthrough extends React.Component<any, any> {
    render() {
      return <span {...this.props} />;
    }
  };

  class ProviderMock extends React.Component<any, any> {

    static propTypes = {
      store: React.PropTypes.shape({
        subscribe: React.PropTypes.func.isRequired,
        dispatch: React.PropTypes.func.isRequired,
        getState: React.PropTypes.func.isRequired,
      }),
      client: React.PropTypes.object.isRequired,
      children: React.PropTypes.element.isRequired,
    };

    static childContextTypes = {
      store: React.PropTypes.object.isRequired,
      client: React.PropTypes.object.isRequired,
    };

    public store: any;
    public client: any;

    constructor(props, context) {
      super(props, context);
      this.client = props.client;

      if (props.store) {
        this.store = props.store;
        return;
      }

      // intialize the built in store if none is passed in
      props.client.initStore();
      this.store = props.client.store;

    }

    getChildContext() {
      return {
        store: this.store,
        client: this.client,
      };
    }

    render() {
      const { children } = this.props;
      return React.Children.only(children);
    }
  };

  describe('prop api', () => {
    it('should pass `ApolloClient.query` as props.query', () => {
      const store = createStore(() => ({ }));
      const query = `
        query people {
          allPeople(first: 1) {
            people {
              name
            }
          }
        }
      `;

      const data = {
        allPeople: {
          people: [
            {
              name: 'Luke Skywalker',
            },
          ],
        },
      };

      const networkInterface = mockNetworkInterface({
        request: { query },
        result: { data },
      });

      const client = new ApolloClient({
        networkInterface,
      });

      @connect()
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      const wrapper = mount(
        <ProviderMock store={store} client={client}>
          <Container pass='through' baz={50} />
        </ProviderMock>
      );


      const props = wrapper.find('span').props() as any;

      expect(props.query).to.exist;
      expect(props.query({ query })).to.be.instanceof(Promise);

    });

    it('should pass `ApolloClient.mutate` as props.mutate', () => {
      const store = createStore(() => ({ }));
      const client = new ApolloClient();

      @connect()
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      const wrapper = mount(
        <ProviderMock store={store} client={client}>
          <Container pass='through' baz={50} />
        </ProviderMock>
      );


      const props = wrapper.find('span').props() as any;

      expect(props.mutate).to.exist;
      try {
        expect(props.mutate()).to.be.instanceof(Promise);
      } catch (e) {
        expect(e).to.be.instanceof(TypeError);
      };

    });

    it('should pass mutation methods as props.mutations dictionary', () => {
      const store = createStore(() => ({ }));

      function mapMutationsToProps() {
        return {
          test: () => ({
            mutate: ``,
          }),
        };
      };

      @connect({ mapMutationsToProps })
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      const wrapper = mount(
        <ProviderMock store={store} client={{}}>
          <Container pass='through' baz={50} />
        </ProviderMock>
      );


      const props = wrapper.find('span').props() as any;

      expect(props.mutations).to.exist;
      expect(props.mutations.test).to.exist;
      expect(props.mutations.test).to.be.instanceof(Function);

    });

    it('should rerun on prop change', (done) => {
      const store = createStore(() => ({
        foo: 'bar',
        baz: 42,
        hello: 'world',
      }));

      const query = `
        query people {
          allPeople(first: 1) {
            people {
              name
            }
          }
        }
      `;

      const data = {
        allPeople: {
          people: [
            {
              name: 'Luke Skywalker',
            },
          ],
        },
      };

      const networkInterface = mockNetworkInterface({
        request: { query },
        result: { data },
      });

      const client = new ApolloClient({
        networkInterface,
      });

      let run = false;
      function mapQueriesToProps({ ownProps }) {
        if (run) {
          expect(ownProps.test).to.equal(null);
          done();
        }

        if (ownProps.test === 'foo') {
          run = true;
        }

        return {
          people: { query },
        };
      };

      @connect({ mapQueriesToProps })
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props}  />;
        }
      };

      class ReRender extends React.Component<any, any> {
        state = {
          test: 'foo',
        };

        componentDidMount() {
          if (this.state.test === 'foo') {
            this.setState({
              test: null,
            });
          }
        }
        render() {
          return <Container {...this.props} test={this.state.test} />;
        }
      };

      mount(
        <ProviderMock store={store} client={client}>
          <ReRender />
        </ProviderMock>
      );

      // const props = wrapper.find('span').props() as any;

      // expect(props.people).to.exist;
      // expect(props.people.loading).to.be.true;

    });

  });

  describe('redux passthrough', () => {
    it('should allow mapStateToProps', () => {
      const store = createStore(() => ({
        foo: 'bar',
        baz: 42,
        hello: 'world',
      }));

      const mapStateToProps = ({ foo, baz }) => ({ foo, baz });

      @ReactReduxConnect(mapStateToProps)
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      @connect({mapStateToProps})
      class ApolloContainer extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      const wrapper = mount(
        <ProviderMock store={store} client={{}}>
          <Container pass='through' baz={50} />
        </ProviderMock>
      );

      const apolloWrapper = mount(
        <ProviderMock store={store} client={{}}>
          <ApolloContainer pass='through' baz={50} />
        </ProviderMock>
      );

      const reduxProps = assign({}, wrapper.find('span').props(), {
        query: undefined,
        mutate: undefined,
      });
      const apolloProps = apolloWrapper.find('span').props();

      expect(reduxProps).to.deep.equal(apolloProps);

    });

    it('should allow mapDispatchToProps', () => {
      function doSomething(thing) {
        return {
          type: 'APPEND',
          body: thing,
        };
      };

      const store = createStore(() => ({
        foo: 'bar',
        baz: 42,
        hello: 'world',
      }));

      const mapDispatchToProps = dispatch => ({
        doSomething: (whatever) => dispatch(doSomething(whatever)),
      });

      @ReactReduxConnect(null, mapDispatchToProps)
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      @connect({mapDispatchToProps})
      class ApolloContainer extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      const wrapper = mount(
        <ProviderMock store={store} client={{}}>
          <Container pass='through' baz={50} />
        </ProviderMock>
      );

      const apolloWrapper = mount(
        <ProviderMock store={store} client={{}}>
          <ApolloContainer pass='through' baz={50} />
        </ProviderMock>
      );

      const reduxProps = assign({}, wrapper.find('span').props(), {
        query: () => {/* tslint  */},
        mutate: () => {/* tslint  */},
      }) as any;
      const apolloProps = apolloWrapper.find('span').props() as any;

      expect(reduxProps.doSomething()).to.deep.equal(apolloProps.doSomething());

    });

    it('should allow mergeProps', () => {
      function doSomething(thing) {
        return {
          type: 'APPEND',
          body: thing,
        };
      };

      const store = createStore(() => ({
        foo: 'bar',
        baz: 42,
        hello: 'world',
      }));

      const mapStateToProps = ({ foo, baz }) => ({ foo, baz });

      const mapDispatchToProps = dispatch => ({
        doSomething: (whatever) => dispatch(doSomething(whatever)),
      });

      const mergeProps = (stateProps, dispatchProps, ownProps) => {
        return {
          bar: stateProps.baz + 1,
          makeSomething: dispatchProps.doSomething,
          hallPass: ownProps.pass,
        };
      };

      @ReactReduxConnect(mapStateToProps, mapDispatchToProps, mergeProps)
      class Container extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      @connect({mapStateToProps, mapDispatchToProps, mergeProps})
      class ApolloContainer extends React.Component<any, any> {
        render() {
          return <Passthrough {...this.props} />;
        }
      };

      const wrapper = mount(
        <ProviderMock store={store} client={{}}>
          <Container pass='through' baz={50} />
        </ProviderMock>
      );

      const apolloWrapper = mount(
        <ProviderMock store={store} client={{}}>
          <ApolloContainer pass='through' baz={50} />
        </ProviderMock>
      );

      const reduxProps = assign({}, wrapper.find('span').props(), {
        query: () => {/* tslint  */},
        mutate: () => {/* tslint  */},
      }) as any;
      const apolloProps = apolloWrapper.find('span').props() as any;

      expect(reduxProps.makeSomething()).to.deep.equal(apolloProps.makeSomething());
      expect(reduxProps.bar).to.equal(apolloProps.bar);
      expect(reduxProps.hallPass).to.equal(apolloProps.hallPass);

    });
  });

  describe('apollo methods', () => {
    describe('queries', () => {
      it('binds a query to props', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const query = `
          query people {
            allPeople(first: 1) {
              people {
                name
              }
            }
          }
        `;

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        const networkInterface = mockNetworkInterface({
          request: { query },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

      function mapQueriesToProps() {
          return {
            people: { query },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container pass='through' baz={50} />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.loading).to.be.true;
      });

      it('stops the query after unmounting', () => {
        const query = `
          query people {
            allPeople(first: 1) {
              people {
                name
              }
            }
          }
        `;

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        const networkInterface = mockNetworkInterface({
          request: { query },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

      function mapQueriesToProps() {
          return {
            people: { query },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock client={client}>
            <Container pass='through' baz={50} />
          </ProviderMock>
        ) as any;

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.loading).to.be.true;

        expect(wrapper.unmount()).to.not.throw;
      });

      it('exposes refetch as part of the props api', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const query = `
          query people {
            allPeople(first: 1) {
              people {
                name
              }
            }
          }
        `;

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        const networkInterface = mockNetworkInterface({
          request: { query },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

      function mapQueriesToProps() {
          return {
            people: { query },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container pass='through' baz={50} />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.refetch).to.be.exist;
        expect(props.people.refetch).to.be.instanceof(Function);
        expect(props.people.refetch).to.not.throw;
      });

      it('resets the loading state when refetching', (done) => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const query = `
          query people {
            allPeople(first: 1) {
              people {
                name
              }
            }
          }
        `;

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        const networkInterface = mockNetworkInterface({
          request: { query },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapQueriesToProps() {
          return {
            people: { query },
          };
        };

        let hasRefetched = false;
        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          componentDidUpdate(prevProps) {
            if (prevProps.people.loading && !this.props.people.loading) {
              if (hasRefetched) {
                return;
              }
              hasRefetched = true;
              this.props.people.refetch();
              return;
            }

            if (this.props.people.loading) {
              expect(this.props.people.loading).to.be.true;
              expect(this.props.people.allPeople).to.exist;
              done();
            }

          }
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        mount(
          <ProviderMock store={store} client={client}>
            <Container pass='through' baz={50} />
          </ProviderMock>
        );
      });

      it('allows variables as part of the request', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const query = `
          query people($count: Int) {
            allPeople(first: $count) {
              people {
                name
              }
            }
          }
        `;

        const variables = {
          count: 1,
        };

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };


        const networkInterface = mockNetworkInterface({
          request: { query, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

      function mapQueriesToProps() {
          return {
            people: { query, variables },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container pass='through' baz={50} />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.loading).to.be.true;
      });

      it('can use passed props as part of the query', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const query = `
          query people($count: Int) {
            allPeople(first: $count) {
              people {
                name
              }
            }
          }
        `;

        const variables = {
          count: 1,
        };

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };


        const networkInterface = mockNetworkInterface({
          request: { query, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapQueriesToProps({ ownProps }) {
          expect(ownProps.passedCountProp).to.equal(2);
          return {
            people: {
              query,
              variables: {
                count: ownProps.passedCountProp,
              },
            },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container passedCountProp={2} />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.loading).to.be.true;
      });

      it('can use the redux state as part of the query', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const query = `
          query people($count: Int) {
            allPeople(first: $count) {
              people {
                name
              }
            }
          }
        `;

        const variables = {
          count: 1,
        };

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };


        const networkInterface = mockNetworkInterface({
          request: { query, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapQueriesToProps({ state }) {
          expect(state.hello).to.equal('world');
          return {
            people: {
              query,
              variables: {
                count: 1,
              },
            },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container passedCountProp={2} />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.loading).to.be.true;
      });

      it('allows for multiple queries', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const peopleQuery = `
          query people($count: Int) {
            allPeople(first: $count) {
              people {
                name
              }
            }
          }
        `;

        const peopleData = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        // const shipData = {
        //   allStarships: {
        //     starships: [
        //       {
        //         name: 'CR90 corvette',
        //       },
        //     ],
        //   },
        // };

        const shipQuery = `
          query starships($count: Int) {
            allStarships(first: $count) {
              starships {
                name
              }
            }
          }
        `;

        const variables = { count: 1 };

        const networkInterface = mockNetworkInterface({
          request: { query: peopleQuery, variables },
          result: { data: peopleData },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapQueriesToProps() {
          return {
            people: { query: peopleQuery, variables },
            ships: { query: shipQuery, variables },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.people).to.exist;
        expect(props.people.loading).to.be.true;

        expect(props.ships).to.exist;
        expect(props.ships.loading).to.be.true;
      });


      it('should update the props of the child component when data is returned', (done) => {
        const store = createStore(() => ({ }));

        const query = `
          query people {
            luke: allPeople(first: 1) {
              people {
                name
              }
            }
          }
        `;

        const data = {
          luke: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        const networkInterface = mockNetworkInterface({
          request: { query },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapQueriesToProps() {
          return {
            luke: { query },
          };
        };

        @connect({ mapQueriesToProps })
        class Container extends React.Component<any, any> {
          componentDidUpdate(prevProps) {
            expect(prevProps.luke.loading).to.be.true;
            expect(this.props.luke.luke).to.deep.equal(data.luke);
            done();
          }
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );
      });

      it('should prefill any data already in the store', (done) => {

        const query = `
          query people {
            allPeople(first: 1) {
              people {
                name
              }
            }
          }
        `;

        const data = {
          allPeople: {
            people: [
              {
                name: 'Luke Skywalker',
              },
            ],
          },
        };

        const networkInterface = mockNetworkInterface({
          request: { query },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        const reducer = client.reducer() as any;

        const store = createStore(
          combineReducers({
            apollo: reducer,
          }),
          applyMiddleware(client.middleware())
        );

        // we prefill the store with a query
        client.query({ query })
          .then(() => {
            function mapQueriesToProps() {
              return {
                people: { query },
              };
            };

            @connect({ mapQueriesToProps })
            class Container extends React.Component<any, any> {
              render() {
                return <Passthrough {...this.props} />;
              }
            };

            const wrapper = mount(
              <ProviderMock store={store} client={client}>
                <Container pass='through' baz={50} />
              </ProviderMock>
            );

            const props = wrapper.find('span').props() as any;

            expect(props.people).to.exist;
            expect(props.people.loading).to.be.false;
            expect(props.people.allPeople).to.deep.equal(data.allPeople);
            done();
          });
      });
    });

    describe('mutations', () => {
      it('should bind mutation data to props', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps() {
          return {
            makeListPrivate: () => ({
              mutation,
              variables,
            }),
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.makeListPrivate).to.exist;
        expect(props.makeListPrivate.loading).to.be.true;
      });

      it('should bind multiple mutation keys to props', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const mutation1 = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const mutation2 = `
          mutation makeListReallyPrivate($listId: ID!) {
            makeListReallyPrivate(id: $listId)
          }
        `;

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation1 },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps() {
          return {
            makeListPrivate: () => ({
              mutation1,
            }),
            makeListReallyPrivate: () => ({
              mutation2,
            }),
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.makeListPrivate).to.exist;
        expect(props.makeListPrivate.loading).to.be.true;
        expect(props.makeListReallyPrivate).to.exist;
        expect(props.makeListReallyPrivate.loading).to.be.true;
      });

      it('should bind mutation handler to `props.mutations[key]`', () => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps() {
          return {
            makeListPrivate: () => ({
              mutation,
            }),
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.makeListPrivate).to.exist;
        expect(props.makeListPrivate.loading).to.be.true;

        expect(props.mutations).to.exist;
        expect(props.mutations.makeListPrivate).to.exist;
        expect(props.mutations.makeListPrivate).to.be.instanceof(Function);
      });

      it('should pass the mutation promise to the child component', (done) => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps() {
          return {
            makeListPrivate: () => ({
              mutation,
            }),
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          render() {
            return <Passthrough {...this.props} />;
          }
        };

        const wrapper = mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );

        const props = wrapper.find('span').props() as any;

        expect(props.makeListPrivate).to.exist;
        expect(props.makeListPrivate.loading).to.be.true;

        expect(props.mutations).to.exist;
        expect(props.mutations.makeListPrivate).to.exist;
        expect(props.mutations.makeListPrivate).to.be.instanceof(Function);
        props.mutations.makeListPrivate()
          .then((err, result) => {
            done();
          })
          .catch(() => {
            done(new Error('should not error'));
          });
      });

      it('should update the props of the child component when data is returned', (done) => {
        const store = createStore(() => ({ }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps() {
          return {
            makeListPrivate: () => ({
              mutation,
              variables,
            }),
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          componentDidMount() {
            // call the muation
            this.props.mutations.makeListPrivate();
          }

          componentDidUpdate(prevProps) {
            // wait until finished loading
            if (!this.props.makeListPrivate.loading) {
              expect(prevProps.makeListPrivate.loading).to.be.true;
              expect(this.props.makeListPrivate.makeListPrivate).to.be.true;
              done();
            }
          }

          render() {
            return <Passthrough {...this.props} />;
          }
        };

        mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );
      });

      it('can use passed props as part of the mutation', (done) => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          hello: 'world',
        }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps({ ownProps }) {
          expect(ownProps.listId).to.equal('1');
          return {
            makeListPrivate: () => {
              return {
                mutation,
                variables: {
                  listId: ownProps.listId,
                },
              };
            },
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          componentDidMount() {
            // call the muation
            this.props.mutations.makeListPrivate();
          }

          componentDidUpdate(prevProps) {
            if (!this.props.makeListPrivate.loading) {
              expect(prevProps.makeListPrivate.loading).to.be.true;
              expect(this.props.makeListPrivate.makeListPrivate).to.be.true;
              done();
            }
          }

          render() {
            return <Passthrough {...this.props} />;
          }
        };

        mount(
          <ProviderMock store={store} client={client}>
            <Container listId={'1'} />
          </ProviderMock>
        );
      });

      it('can use the redux store as part of the mutation', (done) => {
        const store = createStore(() => ({
          foo: 'bar',
          baz: 42,
          listId: '1',
        }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps({ state }) {
          expect(state.listId).to.equal('1');
          return {
            makeListPrivate: () => {
              return {
                mutation,
                variables: {
                  listId: state.listId,
                },
              };
            },
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          componentDidMount() {
            // call the muation
            this.props.mutations.makeListPrivate();
          }

          componentDidUpdate(prevProps) {
            if (!this.props.makeListPrivate.loading) {
              expect(prevProps.makeListPrivate.loading).to.be.true;
              expect(this.props.makeListPrivate.makeListPrivate).to.be.true;
              done();
            }
          }

          render() {
            return <Passthrough {...this.props} />;
          }
        };

        mount(
          <ProviderMock store={store} client={client}>
            <Container listId={'1'} />
          </ProviderMock>
        );
      });

      it('should allow passing custom arugments to mutation handle', (done) => {
        const store = createStore(() => ({ }));

        const mutation = `
          mutation makeListPrivate($listId: ID!) {
            makeListPrivate(id: $listId)
          }
        `;

        const variables = {
          listId: '1',
        };

        const data = {
          makeListPrivate: true,
        };

        const networkInterface = mockNetworkInterface({
          request: { query: mutation, variables },
          result: { data },
        });

        const client = new ApolloClient({
          networkInterface,
        });

        function mapMutationsToProps() {
          return {
            makeListPrivate: (listId) => {
              // expect(listId).to.equal('1');
              return {
                mutation,
                variables: {
                  listId,
                },
              };
            },
          };
        };

        @connect({ mapMutationsToProps })
        class Container extends React.Component<any, any> {
          componentDidMount() {
            // call the muation
            this.props.mutations.makeListPrivate('1');
          }

          componentDidUpdate(prevProps) {
            if (!this.props.makeListPrivate.loading) {
              expect(prevProps.makeListPrivate.loading).to.be.true;
              expect(this.props.makeListPrivate.makeListPrivate).to.be.true;
              done();
            }
          }

          render() {
            return <Passthrough {...this.props} />;
          }
        };

        mount(
          <ProviderMock store={store} client={client}>
            <Container />
          </ProviderMock>
        );
      });

    });
  });
});

function mockNetworkInterface(
  mockedRequest: {
    request: any,
    result: GraphQLResult,
  }
) {
  const requestToResultMap: any = {};
  const { request, result } = mockedRequest;
  // Populate set of mocked requests
  requestToResultMap[requestToKey(request)] = result as GraphQLResult;

  // A mock for the query method
  const queryMock = (req: Request) => {
    return new Promise((resolve, reject) => {
      // network latency
      const resultData = requestToResultMap[requestToKey(req)];
      if (!resultData) {
        throw new Error(`Passed request that wasn't mocked: ${requestToKey(req)}`);
      }
      resolve(resultData);

    });
  };

  return {
    query: queryMock,
    _uri: 'mock',
    _opts: {},
    _middlewares: [],
    use() { return; },
  };
}


function requestToKey(request: any): string {
  const query = request.query && print(parse(request.query));

  return JSON.stringify({
    variables: request.variables,
    query,
  });
}
