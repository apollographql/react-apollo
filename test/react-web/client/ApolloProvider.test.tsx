
import * as React from 'react';
import { shallow } from 'enzyme';
import { createStore } from 'redux';

declare function require(name: string);
import * as TestUtils from 'react-addons-test-utils';

import ApolloClient from 'apollo-client';

import ApolloProvider  from '../../../src/ApolloProvider';

interface ChildContext {
  apolloClients: Object;
  store: Object;
}

describe('<ApolloProvider /> Component', () => {

  class Child extends React.Component<any, { store: any, client: any}> {
    static contextTypes: React.ValidationMap<any> = {
      apolloClients: React.PropTypes.object.isRequired,
      store: React.PropTypes.object.isRequired,
    };

    context: ChildContext;

    render() {
      return <div />;
    }
  }
  const client = new ApolloClient();
  const store = createStore(() => ({}));


  it('should render children components', () => {
    const wrapper = shallow(
      <ApolloProvider store={store} client={client}>
        <div className='unique'/>
      </ApolloProvider>
    );

    expect(wrapper.contains(<div className='unique'/>)).toBe(true);
  });

  it('should require a client', () => {
    const originalConsoleError = console.error;
    console.error = () => { /* noop */ };
    expect(() => {
      shallow(
        <ApolloProvider client={undefined}>
          <div className='unique'/>
        </ApolloProvider>
      );
    }).toThrowError(
      'ApolloClient was not passed a client instance. Make ' +
      'sure you pass in your client via the "client" prop.'
    );
    console.error = originalConsoleError;
  });

  it('should not require a store', () => {
    const wrapper = shallow(
      <ApolloProvider client={client}>
        <div className='unique'/>
      </ApolloProvider>
    );

    expect(wrapper.contains(<div className='unique'/>)).toBe(true);
  });

  it('should throw if rendered without a child component', () => {
    const originalConsoleError = console.error;
    console.error = () => { /* noop */ };
    expect(() => {
      shallow(
        <ApolloProvider store={store} client={client}/>
      );
    }).toThrowError(Error);
    console.error = originalConsoleError;
  });

  it('should add the default client to the child context', () => {
    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider store={store} client={client}>
        <Child />
      </ApolloProvider>
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(tree, Child);
    expect(child.context.apolloClients.default).toEqual(client);

  });

  it('should add extra clients to the child context', () => {
    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider client={client} as="extraClient">
        <Child />
      </ApolloProvider>
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(tree, Child);
    expect(child.context.apolloClients.extraClient).toEqual(client);

  });

  it('should add the store to the child context', () => {
    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider store={store} client={client}>
        <Child />
      </ApolloProvider>
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(tree, Child);
    expect(child.context.store).toEqual(store);

  });
});
