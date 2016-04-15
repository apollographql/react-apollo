/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { shallow, ShallowWrapper } from 'enzyme';
import { createStore } from 'redux';

declare function require(name: string);
const chaiEnzyme = require('chai-enzyme');
chai.use(chaiEnzyme()) // Note the invocation at the end
const { expect, assert } = chai;

import Provider from '../src/Provider';

describe('<Provider /> Component', () => {

  it('should render children components', () => {
    const store = createStore(() => ({}))

    const wrapper = shallow(
      <Provider store={store} client={{}}>
        <div className="unique" />
      </Provider>
    );

    expect(wrapper.contains(<div className="unique" />)).to.equal(true);
  });

});