import * as React from 'react';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import { ApolloProvider, ApolloConsumer } from '../../src';
import { mount } from 'enzyme';

const client = new ApolloClient({
  cache: new Cache(),
  link: new ApolloLink((o, f) => (f ? f(o) : null)),
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

  it('renders the content in the children prop', () => {
    const wrapper = mount(
      <ApolloProvider client={client}>
        <ApolloConsumer>{() => <div />}</ApolloConsumer>
      </ApolloProvider>,
    );

    expect(wrapper.find('div').exists()).toBeTruthy();
  });
});
