/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { NetworkInterface } from 'apollo-client';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string)

import { mockNetworkInterface } from '../../../../../src/test-utils';
import { ApolloProvider, graphql } from '../../../../../src';

// XXX: this is also defined in apollo-client
// I'm not sure why mocha doesn't provide something like this, you can't
// always use promises
const wrap = (done: Function, cb: (...args: any[]) => any) => (
  ...args: any[]
) => {
  try {
    return cb(...args);
  } catch (e) {
    done(e);
  }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('[queries] loading', () => {
  // networkStatus / loading
  it('exposes networkStatus as a part of the props api', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        expect(data.networkStatus).toBeTruthy();
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('should set the initial networkStatus to 1 (loading)', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<any, any> {
      constructor({ data: { networkStatus } }) {
        super();
        expect(networkStatus).toBe(1);
        done();
      }

      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('should set the networkStatus to 7 (ready) when the query is loaded', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps({ data: { networkStatus } }) {
        expect(networkStatus).toBe(7);
        done();
      }

      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });

  it('should set the networkStatus to 2 (setVariables) when the query variables are changed', done => {
    let count = 0;
    const query = gql`
      query people($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;

    const data1 = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    const variables1 = { first: 1 };

    const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
    const variables2 = { first: 2 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables: variables1 }, result: { data: data1 } },
      { request: { query, variables: variables2 }, result: { data: data2 } },
    );

    const client = new ApolloClient({ networkInterface, addTypename: false });

    @graphql(query, {
      options: props => ({
        variables: props,
        notifyOnNetworkStatusChange: true,
      }),
    })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(nextProps) {
        // variables changed, new query is loading, but old data is still there
        if (count === 1 && nextProps.data.loading) {
          expect(nextProps.data.networkStatus).toBe(2);
          expect(nextProps.data.allPeople).toEqual(data1.allPeople);
        }
        // query with new variables is loaded
        if (count === 1 && !nextProps.data.loading && this.props.data.loading) {
          expect(nextProps.data.networkStatus).toBe(7);
          expect(nextProps.data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }
      render() {
        return null;
      }
    }

    class ChangingProps extends React.Component<any, any> {
      state = { first: 1 };

      componentDidMount() {
        setTimeout(() => {
          count++;
          this.setState({ first: 2 });
        }, 50);
      }

      render() {
        return <Container first={this.state.first} />;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ChangingProps />
      </ApolloProvider>,
    );
  });

  it('resets the loading state after a refetched query', () =>
    new Promise((resolve, reject) => {
      const query = gql`
        query people {
          allPeople(first: 1) {
            people {
              name
            }
          }
        }
      `;
      const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
      const data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data } },
        { request: { query }, result: { data: data2 } },
      );
      const client = new ApolloClient({ networkInterface, addTypename: false });

      let count = 0;
      @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
      class Container extends React.Component<any, any> {
        componentWillReceiveProps = wrap(reject, props => {
          switch (count++) {
            case 0:
              expect(props.data.networkStatus).toBe(7);
              props.data.refetch();
              break;
            case 1:
              expect(props.data.loading).toBe(true);
              expect(props.data.networkStatus).toBe(4);
              expect(props.data.allPeople).toEqual(data.allPeople);
              break;
            case 2:
              expect(props.data.loading).toBe(false);
              expect(props.data.networkStatus).toBe(7);
              expect(props.data.allPeople).toEqual(data2.allPeople);
              resolve();
              break;
            default:
              reject(new Error('Too many props updates'));
          }
        });

        render() {
          return null;
        }
      }

      const wrapper = renderer.create(
        <ApolloProvider client={client}>
          <Container />
        </ApolloProvider>,
      );
    }));

  it('correctly sets loading state on remounted network-only query', done => {
    const query = gql`
      query pollingPeople {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Darth Skywalker' }] } };
    const networkInterface = mockNetworkInterface({
      request: { query },
      result: { data },
      delay: 10,
      newData: () => ({
        data: {
          allPeople: {
            people: [{ name: `Darth Skywalker - ${Math.random()}` }],
          },
        },
      }),
    });
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let wrapper,
      app,
      count = 0;

    @graphql(query, { options: { fetchPolicy: 'network-only' } })
    class Container extends React.Component<any, any> {
      componentWillMount() {
        if (count === 1) {
          expect(this.props.data.loading).toBe(true); // on remount
          count++;
        }
      }
      componentWillReceiveProps(props) {
        if (count === 0) {
          // has data
          wrapper.unmount();
          setTimeout(() => {
            wrapper = mount(app);
          }, 5);
        }

        if (count === 2) {
          // remounted data after fetch
          expect(props.data.loading).toBe(false);
          expect(props.data.allPeople).toBeTruthy();
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    }

    app = (
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>
    );

    wrapper = mount(app);
  });

  it('correctly sets loading state on remounted component with changed variables', done => {
    const query = gql`
      query remount($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: null };
    const variables = { first: 1 };
    const variables2 = { first: 2 };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data }, delay: 10 },
      {
        request: { query, variables: variables2 },
        result: { data },
        delay: 10,
      },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let wrapper,
      render,
      count = 0;

    @graphql(query, { options: ({ first }) => ({ variables: { first } }) })
    class Container extends React.Component<any, any> {
      componentWillMount() {
        if (count === 1) {
          expect(this.props.data.loading).toBe.true; // on remount
          count++;
        }
      }
      componentWillReceiveProps(props) {
        if (count === 0) {
          // has data
          wrapper.unmount();
          setTimeout(() => {
            wrapper = mount(render(2));
          }, 5);
        }

        if (count === 2) {
          // remounted data after fetch
          expect(props.data.loading).toBe.false;
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    }

    render = first =>
      <ApolloProvider client={client}>
        <Container first={first} />
      </ApolloProvider>;

    wrapper = mount(render(1));
  });

  it('correctly sets loading state on remounted component with changed variables (alt)', done => {
    const query = gql`
      query remount($name: String) {
        allPeople(name: $name) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: null };
    const variables = { name: 'does-not-exist' };
    const variables2 = { name: 'nothing-either' };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data }, delay: 10 },
      {
        request: { query, variables: variables2 },
        result: { data },
        delay: 10,
      },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let count = 0;

    @graphql(query)
    class Container extends React.Component<any, any> {
      render() {
        const { loading } = this.props.data;
        if (count === 0) expect(loading).toBe.true;
        if (count === 1) expect(loading).toBe.false;
        if (count === 2) expect(loading).toBe.true;
        if (count === 3) {
          expect(loading).toBe.false;
          done();
        }
        count++;
        return null;
      }
    }
    const main = document.createElement('DIV');
    main.id = 'main';
    document.body.appendChild(main);

    const render = props => {
      ReactDOM.render(
        <ApolloProvider client={client}>
          <Container {...props} />
        </ApolloProvider>,
        document.getElementById('main'),
      );
    };

    // Initial render.
    render(variables);

    // Prop update: fetch.
    setTimeout(() => render(variables2), 1000);
  });

  it('correctly sets loading state on component with changed variables and unchanged result', done => {
    const query = gql`
      query remount($first: Int) {
        allPeople(first: $first) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: null };
    const variables = { first: 1 };
    const variables2 = { first: 2 };
    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data }, delay: 10 },
      {
        request: { query, variables: variables2 },
        result: { data },
        delay: 10,
      },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });
    let count = 0;

    const connect = (component): any => {
      return class Container extends React.Component<any, any> {
        constructor(props) {
          super(props);

          this.state = {
            first: 1,
          };
          this.setFirst = this.setFirst.bind(this);
        }

        setFirst(first) {
          this.setState({ first });
        }

        render() {
          return React.createElement(component, {
            first: this.state.first,
            setFirst: this.setFirst,
          });
        }
      };
    };

    @connect
    @graphql(query, { options: ({ first }) => ({ variables: { first } }) })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        if (count === 0) {
          expect(props.data.loading).toBe.false; // has initial data
          setTimeout(() => {
            this.props.setFirst(2);
          }, 5);
        }

        if (count === 1) {
          expect(props.data.loading).toBe.true; // on variables change
        }

        if (count === 2) {
          // new data after fetch
          expect(props.data.loading).toBe.false;
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    }
    const output = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
