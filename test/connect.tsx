/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import { createStore } from 'redux';
import { connect as ReactReduxConnect } from 'react-redux';

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

     function mapQueriesToProps({ watchQuery }) {
        return {
          category: watchQuery({
            query: `
              query people {
                allPeople(first: 1) {
                  people {
                    name
                  }
                }
              }
            `,
          }),
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

      expect(props.category).to.exist;
      expect(props.category.loading).to.be.true;
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
      setTimeout(() => {
        const resultData = requestToResultMap[requestToKey(req)];
        if (!resultData) {
          throw new Error(`Passed request that wasn't mocked: ${requestToKey(req)}`);
        }
        resolve(resultData);
      }, 100);

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
