import React from 'react';
import TestUtils from 'react-dom/test-utils';
import { shallow, mount } from 'enzyme';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';

import { ApolloProvider } from '../ApolloProvider';
import { getApolloContext } from '../ApolloContext';

describe('<ApolloProvider /> Component', () => {
  const client = new ApolloClient({
    cache: new Cache(),
    link: new ApolloLink((o, f) => (f ? f(o) : null)),
  });

  class Child extends React.Component<any, { store: any; client: any }> {
    static contextType = getApolloContext();

    componentDidUpdate() {
      if (this.props.data) this.props.data.refetch();
    }

    render() {
      return null;
    }
  }

  interface Props {
    client: ApolloClient<any>;
  }

  class Container extends React.Component<Props, any> {
    constructor(props: Props) {
      super(props);
      this.state = {};
    }

    componentDidMount() {
      this.setState({
        client: this.props.client,
      });
    }

    render() {
      return (
        <ApolloProvider client={this.state.client || this.props.client}>
          <Child />
        </ApolloProvider>
      );
    }
  }

  it('should render children components', () => {
    const wrapper = mount(
      <ApolloProvider client={client}>
        <div className="unique" />
      </ApolloProvider>,
    );

    expect(wrapper.contains(<div className="unique" />)).toBeTruthy();
  });

  it('should support the 2.0', () => {
    const wrapper = mount(
      <ApolloProvider client={{} as ApolloClient<any>}>
        <div className="unique" />
      </ApolloProvider>,
    );

    expect(wrapper.contains(<div className="unique" />)).toBeTruthy();
  });

  it('should require a client', () => {
    const originalConsoleError = console.error;
    console.error = () => {
      /* noop */
    };
    expect(() => {
      // Before testing `ApolloProvider`, we first fully reset the
      // existing context using `ApolloContext.Provider` directly.
      const ApolloContext = getApolloContext();
      mount(
        <ApolloContext.Provider value={{}}>
          <ApolloProvider client={undefined as any}>
            <div className="unique" />
          </ApolloProvider>
        </ApolloContext.Provider>,
      );
    }).toThrowError(
      'ApolloProvider was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );
    console.error = originalConsoleError;
  });

  it('should not require a store', () => {
    const wrapper = mount(
      <ApolloProvider client={client}>
        <div className="unique" />
      </ApolloProvider>,
    );
    expect(wrapper.contains(<div className="unique" />)).toBeTruthy();
  });

  it('should add the client to the children context', () => {
    const wrapper = mount(
      <ApolloProvider client={client}>
        <Child />
        <Child />
      </ApolloProvider>,
    );
    const children = wrapper.find(Child);
    expect(children).toHaveLength(2);
    children.forEach(node => {
      expect(node.instance().context.client).toEqual(client);
    });
  });

  it('should update props when the client changes', () => {
    const container = shallow(<Container client={client} />);
    expect(container.find(ApolloProvider).props().client).toEqual(client);

    const newClient = new ApolloClient({
      cache: new Cache(),
      link: new ApolloLink((o, f) => (f ? f(o) : null)),
    });
    container.setState({ client: newClient });
    expect(container.find(ApolloProvider).props().client).toEqual(newClient);
    expect(container.find(ApolloProvider).props().client).not.toEqual(client);
  });

  it('child component should be able to query new client when props change', () => {
    const container = TestUtils.renderIntoDocument<React.Component<any, any>>(
      <Container client={client} />,
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(container, Child);
    expect(child.context.client).toEqual(client);

    const newClient = new ApolloClient({
      cache: new Cache(),
      link: new ApolloLink((o, f) => (f ? f(o) : null)),
    });

    container.setState({ client: newClient });

    expect(child.context.client).toEqual(newClient);
    expect(child.context.client).not.toEqual(client);
  });
});
