/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { shallow } from 'enzyme';
// import * as TestUtils from 'react-addons-test-utils';
import { createStore } from 'redux';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import ApolloProvider from '../src/Provider';

import ApolloClient from 'apollo-client';

describe('<ApolloProvider /> Component', () => {

  class Child extends React.Component<any, { store: any, client: any}> {
    render() {
      return <div />;
    }
  };

  const client = new ApolloClient();

  // XXX why isn't this working with TestUtils typing?
  // Child.contextType = {
  //   store: React.PropTypes.object.isRequired,
  //   client: React.PropTypes.object.isRequired,
  // };

  it('should render children components', () => {
    const store = createStore(() => ({}));

    const wrapper = shallow(
      <ApolloProvider store={store} client={client}>
        <div className='unique' />
      </ApolloProvider>
    );

    expect(wrapper.contains(<div className='unique' />)).to.equal(true);
  });

  it('should not require a store', () => {
    const wrapper = shallow(
      <ApolloProvider client={client}>
        <div className='unique' />
      </ApolloProvider>
    );

    expect(wrapper.contains(<div className='unique' />)).to.equal(true);
  });

  // it('should throw if rendered without a child component', () => {
  //   const store = createStore(() => ({}));

  //   try {
  //     shallow(
  //       <Provider store={store} client={client} />
  //     );
  //   } catch (e) {
  //     expect(e).to.be.instanceof(Error);
  //   }

  // });

  // it('should add the store to the child context', () => {
  //     const store = createStore(() => ({}));

  //     const tree = TestUtils.renderIntoDocument(
  //       <Provider store={store} client={{}}>
  //         <Child />
  //       </Provider>
  //     ) as React.Component<any, any>;

  //     const child = TestUtils.findRenderedComponentWithType(tree, Child as ComponentClass<any>);
  //     expect(child.context.store).to.deep.equal(store);

  //   });

});
