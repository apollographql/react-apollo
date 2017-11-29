/// <reference types="jest" />

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom';
import * as renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import gql from 'graphql-tag';
import ApolloClient, { ApolloError, ObservableQuery } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { connect } from 'react-redux';
import { withState } from 'recompose';

declare function require(name: string);

import { mockSingleLink } from '../../../../../src/test-utils';
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

describe('[queries] errors', () => {
  let error;
  beforeEach(() => {
    error = console.error;
    console.error = jest.fn(() => {});
  });
  afterEach(() => {
    console.error = error;
  });

  // errors
  it('does not swallow children errors', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    class ErrorBoundary extends React.Component {
      componentDidCatch(e, info) {
        expect(e.message).toMatch(/bar is not a function/);
        done();
      }

      render() {
        return this.props.children;
      }
    }
    let bar;
    const ContainerWithData = graphql(query)(() => {
      bar(); // this will throw
      return null;
    });

    renderer.create(
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <ContainerWithData />
        </ErrorBoundary>
      </ApolloProvider>,
    );
  });

  it('can unmount without error', done => {
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
    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const ContainerWithData = graphql(query)(() => null);

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    ) as any;

    try {
      wrapper.unmount();
      done();
    } catch (e) {
      throw new Error(e);
    }
  });

  it('passes any GraphQL errors in props', done => {
    const query = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const link = mockSingleLink({
      request: { query },
      error: new Error('boo'),
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    @graphql(query)
    class ErrorContainer extends React.Component<any, any> {
      componentWillReceiveProps({ data }) {
        // tslint:disable-line
        expect(data.error).toBeTruthy();
        expect(data.error.networkError).toBeTruthy();
        // expect(data.error instanceof ApolloError).toBe(true);
        done();
      }
      render() {
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <ErrorContainer />
      </ApolloProvider>,
    );
  });

  describe('uncaught exceptions', () => {
    let unhandled = [];
    function handle(reason) {
      unhandled.push(reason);
    }
    beforeEach(() => {
      unhandled = [];
      process.on('unhandledRejection', handle);
    });
    afterEach(() => {
      process.removeListener('unhandledRejection', handle);
    });

    it('does not log when you change variables resulting in an error', done => {
      const query = gql`
        query people($var: Int) {
          allPeople(first: $var) {
            people {
              name
            }
          }
        }
      `;
      const var1 = { var: 1 };
      const data = { allPeople: { people: { name: 'Luke Skywalker' } } };
      const var2 = { var: 2 };
      const link = mockSingleLink(
        {
          request: { query, variables: var1 },
          result: { data },
        },
        {
          request: { query, variables: var2 },
          error: new Error('boo'),
        },
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      let iteration = 0;
      @withState('var', 'setVar', 1)
      @graphql(query)
      class ErrorContainer extends React.Component<any, any> {
        componentWillReceiveProps(props) {
          // tslint:disable-line
          iteration += 1;
          if (iteration === 1) {
            expect(props.data.allPeople).toEqual(data.allPeople);
            props.setVar(2);
          } else if (iteration === 2) {
            expect(props.data.loading).toBeTruthy();
          } else if (iteration === 3) {
            expect(props.data.error).toBeTruthy();
            expect(props.data.error.networkError).toBeTruthy();
            // We need to set a timeout to ensure the unhandled rejection is swept up
            setTimeout(() => {
              expect(unhandled.length).toEqual(0);
              done();
            }, 0);
          }
        }
        render() {
          return null;
        }
      }

      renderer.create(
        <ApolloProvider client={client}>
          <ErrorContainer />
        </ApolloProvider>,
      );
    });
  });

  it('will not log a warning when there is an error that is caught in the render method', () =>
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
      const link = mockSingleLink({
        request: { query },
        error: new Error('oops'),
      });
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const origError = console.error;
      const errorMock = jest.fn();
      console.error = errorMock;

      let renderCount = 0;
      @graphql(query)
      class HandledErrorComponent extends React.Component<any, any> {
        render() {
          try {
            switch (renderCount++) {
              case 0:
                expect(this.props.data.loading).toEqual(true);
                break;
              case 1:
                expect(this.props.data.error.message).toEqual(
                  'Network error: oops',
                );
                break;
              default:
                throw new Error('Too many renders.');
            }
          } catch (error) {
            console.error = origError;
            reject(error);
          }
          return null;
        }
      }

      renderer.create(
        <ApolloProvider client={client}>
          <HandledErrorComponent />
        </ApolloProvider>,
      );

      setTimeout(() => {
        try {
          expect(errorMock.mock.calls.length).toBe(0);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          console.error = origError;
        }
      }, 20);
    }));

  it('will log a warning when there is an error that is not caught in the render method', () =>
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
      const link = mockSingleLink({
        request: { query },
        error: new Error('oops'),
      });
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const origError = console.error;
      const errorMock = jest.fn();
      console.error = errorMock;

      let renderCount = 0;
      @graphql(query)
      class UnhandledErrorComponent extends React.Component<any, any> {
        render() {
          try {
            switch (renderCount++) {
              case 0:
                expect(this.props.data.loading).toEqual(true);
                break;
              case 1:
                // Noop. Don’t handle the error so a warning will be logged to the console.
                break;
              default:
                throw new Error('Too many renders.');
            }
          } catch (error) {
            console.error = origError;
            reject(error);
          }
          return null;
        }
      }

      renderer.create(
        <ApolloProvider client={client}>
          <UnhandledErrorComponent />
        </ApolloProvider>,
      );

      setTimeout(() => {
        try {
          expect(renderCount).toBe(2);
          expect(errorMock.mock.calls.length).toBe(1);
          expect(errorMock.mock.calls[0][0]).toEqual(
            'Unhandled (in react-apollo:Apollo(UnhandledErrorComponent))',
          );
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          console.error = origError;
        }
      }, 50);
    }));

  it('passes any cached data when there is a GraphQL error', done => {
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
    const link = mockSingleLink(
      { request: { query }, result: { data } },
      { request: { query }, error: new Error('No Network Connection') },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let count = 0;
    @graphql(query, { options: { notifyOnNetworkStatusChange: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps = props => {
        try {
          switch (count++) {
            case 0:
              expect(props.data.allPeople).toEqual(data.allPeople);
              props.data.refetch();
              break;
            case 1:
              expect(props.data.loading).toBe(true);
              expect(props.data.allPeople).toEqual(data.allPeople);
              break;
            case 2:
              expect(props.data.loading).toBe(false);
              expect(props.data.error).toBeTruthy();
              expect(props.data.allPeople).toEqual(data.allPeople);
              done();
              break;
          }
        } catch (e) {
          done.fail(e);
        }
      };

      render() {
        return null;
      }
    }

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );
  });
});
