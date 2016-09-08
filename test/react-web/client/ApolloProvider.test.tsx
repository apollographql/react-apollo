
import * as React from 'react';
import { shallow } from 'enzyme';
import { createStore } from 'redux';

declare function require(name: string);
import * as TestUtils from 'react-addons-test-utils';

import ApolloClient from 'apollo-client';

import ApolloProvider  from '../../../src/ApolloProvider';

interface ChildContext {
  store: Object;
  client: Object;
}

describe('<ApolloProvider /> Component', () => {

  class Child extends React.Component<any, { store: any, client: any}> {
    static contextTypes: React.ValidationMap<any> = {
      client: React.PropTypes.object.isRequired,
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
    expect(() => {
      shallow(
        <ApolloProvider store={store} client={client}/>
      );
    }).toThrowError(Error);
  });

  it('should add the client to the child context', () => {
    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider store={store} client={client}>
        <Child />
      </ApolloProvider>
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(tree, Child);
    expect(child.context.client).toEqual(client);

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
