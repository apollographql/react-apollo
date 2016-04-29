/// <reference path="../typings/main.d.ts" />

import * as React from 'react';
import * as chai from 'chai';
import { shallow } from 'enzyme';
import { createStore } from 'redux';

declare function require(name: string);
import chaiEnzyme = require('chai-enzyme');
import * as TestUtils from 'react-addons-test-utils';

chai.use(chaiEnzyme()); // Note the invocation at the end
const { expect } = chai;

import composeApolloProvider from '../src/composeApolloProvider';

import ApolloClient from 'apollo-client';

import { Provider } from 'react-redux';

interface ChildContext {
    store: Object;
    client: Object;
}

describe('composeApolloProvider, Function', () => {

    class Child extends React.Component<any, { store: any, client: any}> {
        static contextTypes: React.ValidationMap<any> =  {
            client:  React.PropTypes.object.isRequired,
            store: React.PropTypes.object.isRequired,
        };
        context: ChildContext;
        render() {
            return <div />;
        }
    }

    const client = new ApolloClient();
    const store = createStore(() => ({}));
    const ApolloProvider = composeApolloProvider(Provider);

    it('should render children components', () => {
        const wrapper = shallow(
            <ApolloProvider store={store} client={client}>
                <div className='unique' />
            </ApolloProvider>
        );

        expect(wrapper.contains(<div className='unique' />)).to.equal(true);
    });

     it('should throw if rendered without a child component', () => {
       try {
         shallow(
           <ApolloProvider store={store} client={client} />
         );
       } catch (e) {
         expect(e).to.be.instanceof(Error);
       }

     });

    it('should add the client to the child context', () => {
        const tree = TestUtils.renderIntoDocument(
            <ApolloProvider store={store} client={client}>
                <Child />
            </ApolloProvider>
        ) as React.Component<any, any>;

        const child = TestUtils.findRenderedComponentWithType(tree, Child);
        expect(child.context.client).to.deep.equal(client);

    });
});


