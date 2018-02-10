import * as React from 'react';
import { shallow } from 'enzyme';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import ApolloProvider from '../../src/ApolloProvider';

describe('<ApolloProvider /> Component', () => {
  const client = new ApolloClient({
    cache: new Cache(),
    link: new ApolloLink((o, f) => (f ? f(o) : null)),
  });

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
        <div />
        </ApolloProvider>
      );
    }
  }

  it('should render children components', () => {
    const wrapper = shallow(
      <ApolloProvider client={client}>
        <div className="unique" />
      </ApolloProvider>,
    );

    expect(wrapper.contains(<div className="unique" />)).toBeTruthy();
  });

  it('should support the 2.0', () => {
    const wrapper = shallow(
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
      shallow(
        <ApolloProvider client={undefined as any}>
          <div className="unique" />
        </ApolloProvider>,
      );
    }).toThrowError(
      'ApolloClient was not passed a client instance. Make ' +
        'sure you pass in your client via the "client" prop.',
    );
    console.error = originalConsoleError;
  });

  it('should not require a store', () => {
    const wrapper = shallow(
      <ApolloProvider client={client}>
        <div className="unique" />
      </ApolloProvider>,
    );

    expect(wrapper.contains(<div className="unique" />)).toBeTruthy();
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
});
