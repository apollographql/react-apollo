import React from 'react';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';

import ApolloProvider from '../../../src/ApolloProvider';
import ApolloConsumer from '../../../src/ApolloConsumer';
import { mount } from 'enzyme';
import invariant from 'invariant';

const client = new ApolloClient({
  cache: new Cache(),
  link: new ApolloLink((o, f) => f(o)),
});

describe('<ApolloConsumer /> component', () => {
  it('has a render prop', done => {
    mount(
      <ApolloProvider client={client}>
        <ApolloConsumer>
          {clientRender => {
            try {
              expect(clientRender).toBe(client);
              done();
            } catch (e) {
              done.fail(e);
            }
            return null;
          }}
        </ApolloConsumer>
      </ApolloProvider>,
    );
  });

  it('renders the content in the render prop', () => {
    const wrapper = mount(
      <ApolloProvider client={client}>
        <ApolloConsumer>{clientRender => <div />}</ApolloConsumer>
      </ApolloProvider>,
    );

    expect(wrapper.find('div').exists()).toBeTruthy();
  });

  it('errors if there is no client in the context', () => {
    // Prevent Error about missing context type from appearing in the console.
    const errorLogger = console.error;
    console.error = () => {};
    expect(() => {
      mount(<ApolloConsumer render={client => null} />);
    }).toThrowError(
      'Could not find "client" in the context of ApolloConsumer. Wrap the root component in an <ApolloProvider>',
    );

    console.error = errorLogger;
  });
});
