/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { shallow } from 'enzyme';
import { createStore } from 'redux';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import ApolloProvider from '../src/ApolloProvider';

import ApolloClient from 'apollo-client';

describe('<ApolloProvider /> Component', () => {

    class Child extends React.Component<any, { store: any, client: any}> {
        render() {
            return <div />;
        }
    }

    const client = new ApolloClient();

    it('should render children components', () => {
        const store = createStore(() => ({}));

        const wrapper = shallow(
            <ApolloProvider store={store} client={client}>
                <div className='unique' />
            </ApolloProvider>
        );

        expect(wrapper.contains(<div className='unique' />)).to.equal(true);
    });

     it('should throw if rendered without a child component', () => {
       const store = createStore(() => ({}));

       try {
         shallow(
           <ApolloProvider store={store} client={client} />
         );
       } catch (e) {
         expect(e).to.be.instanceof(Error);
       }

     });
});
