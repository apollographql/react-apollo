
import * as React from 'react';
import * as chai from 'chai';
import { mount } from 'enzyme';
import { createStore } from 'redux';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import mockNetworkInterface from '../../mocks/mockNetworkInterface';
import {
  Passthrough,
  ProviderMock,
} from '../../mocks/components';

import connect from '../../../src/connect';

describe('props', () => {
  it('should pass `ApolloClient.query` as props.query', () => {
    const store = createStore(() => ({ }));
    const query = gql`
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

  it('should pass `ApolloClient.watchQuery` as props.watchQuery', () => {
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

    expect(props.watchQuery).to.exist;
    try {
      expect(props.watchQuery()).to.be.instanceof(Promise);
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

    const query = gql`
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
