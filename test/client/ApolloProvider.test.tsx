import * as React from 'react';
import * as PropTypes from 'prop-types';
import { shallow } from 'enzyme';
import * as TestUtils from 'react-dom/test-utils';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import ApolloProvider from '../../src/ApolloProvider';

describe('<ApolloProvider /> Component', () => {
  const client = new ApolloClient({
    cache: new Cache(),
    link: new ApolloLink((o, f) => f(o)),
  });

  interface ChildContext {
    client: Object;
  }

  class Child extends React.Component<any, { store: any; client: any }> {
    static contextTypes: React.ValidationMap<any> = {
      client: PropTypes.object.isRequired,
    };

    context: ChildContext;

    render() {
      return null;
    }

    componentDidUpdate() {
      if (this.props.data) this.props.data.refetch();
    }
  }

  class Container extends React.Component<any, any> {
    constructor(props) {
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

  // --- unused ---
  // const query = gql`
  //   query {
  //     authors {
  //       id
  //     }
  //   }
  // `;
  // const GQLChild = graphql(query)(Child);
  // class ConnectedContainer extends React.Component<any, any> {
  //   constructor(props) {
  //     super(props);
  //     this.state = {};
  //   }
  //
  //   componentDidMount() {
  //     this.setState({
  //       client: this.props.client,
  //     });
  //   }
  //
  //   render() {
  //     return (
  //       <ApolloProvider client={this.state.client || this.props.client}>
  //         <GQLChild />
  //       </ApolloProvider>
  //     );
  //   }
  // }

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
        <ApolloProvider client={undefined}>
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

  // NOTE: now that we added types, this fails directly on type checking - we have no way to runtime check
  //        something that cannot even be compiled.
  // it('should throw if rendered without a child component', () => {
  //   const originalConsoleError = console.error;
  //   console.error = () => {
  //     /* noop */
  //   };
  //   expect(() => {
  //     shallow(<ApolloProvider client={client} />);
  //   }).toThrowError(Error);
  //   console.error = originalConsoleError;
  // });

  it('should add the client to the child context', () => {
    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider client={client}>
        <Child />
      </ApolloProvider>,
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(tree, Child);
    expect(child.context.client).toEqual(client);
  });

  it('should update props when the client changes', () => {
    const container = shallow(<Container client={client} />);
    expect(container.find(ApolloProvider).props().client).toEqual(client);

    const newClient = new ApolloClient({
      cache: new Cache(),
      link: new ApolloLink((o, f) => f(o)),
    });
    container.setState({ client: newClient });
    expect(container.find(ApolloProvider).props().client).toEqual(newClient);
    expect(container.find(ApolloProvider).props().client).not.toEqual(client);
  });

  it('child component should be able to query new client when props change', () => {
    const container = TestUtils.renderIntoDocument(
      <Container client={client} />,
    ) as React.Component<any, any>;

    const child = TestUtils.findRenderedComponentWithType(container, Child);
    expect(child.context.client).toEqual(client);

    const newClient = new ApolloClient({
      cache: new Cache(),
      link: new ApolloLink((o, f) => f(o)),
    });

    container.setState({ client: newClient });

    expect(child.context.client).toEqual(newClient);
    expect(child.context.client).not.toEqual(client);
  });
});
