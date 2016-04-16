/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import { createStore } from 'redux';
import { connect as ReactReduxConnect } from 'react-redux';
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

    static childContextTypes = {
      store: React.PropTypes.object.isRequired,
      client: React.PropTypes.object.isRequired,
    };

    getChildContext() {
      return {
        store: this.props.store,
        client: this.props.client,
      };
    }

    render() {
      return React.Children.only(this.props.children);
    }
  };

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

      const reduxProps = wrapper.find('span').props();
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

      const reduxProps = wrapper.find('span').props() as any;
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

      const reduxProps = wrapper.find('span').props() as any;
      const apolloProps = apolloWrapper.find('span').props() as any;

      expect(reduxProps.makeSomething()).to.deep.equal(apolloProps.makeSomething());
      expect(reduxProps.bar).to.equal(apolloProps.bar);
      expect(reduxProps.hallPass).to.equal(apolloProps.hallPass);

    });
  });

  describe('apollo methods', () => {
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
          expect(this.props.luke.result).to.deep.equal(data);
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
