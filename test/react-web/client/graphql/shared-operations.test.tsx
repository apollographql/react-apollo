import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

const TestUtils = require('react-dom/test-utils');

declare function require(name: string)

import { mockNetworkInterface } from '../../../../src/test-utils';
import { ApolloProvider, graphql, withApollo } from '../../../../src';
import { compose } from '../../../../src/';

describe('shared operations', () => {
  describe('withApollo', () => {
    it('passes apollo-client to props', () => {
      const client = new ApolloClient();

      @withApollo
      class ContainerWithData extends React.Component<any, any> {
        render() {
          expect(this.props.client).toEqual(client);
          return null;
        }
      }

      renderer.create(
        <ApolloProvider client={client}>
          <ContainerWithData />
        </ApolloProvider>,
      );
    });

    it('allows a way to access the wrapped component instance', () => {
      const client = new ApolloClient();

      const testData = { foo: 'bar' };

      class Container extends React.Component<any, any> {
        someMethod() {
          return testData;
        }

        render() {
          return <span />;
        }
      }

      const Decorated = withApollo(Container, { withRef: true });

      const tree = TestUtils.renderIntoDocument(
        <ApolloProvider client={client}>
          <Decorated />
        </ApolloProvider>,
      ) as any;

      const decorated = TestUtils.findRenderedComponentWithType(
        tree,
        Decorated,
      );

      expect(() => (decorated as any).someMethod()).toThrow();
      expect((decorated as any).getWrappedInstance().someMethod()).toEqual(
        testData,
      );
      expect((decorated as any).refs.wrappedInstance.someMethod()).toEqual(
        testData,
      );

      const DecoratedWithSkip = withApollo(Container, {
        withRef: true,
        skip: true,
      });

      const treeWithSkip = TestUtils.renderIntoDocument(
        <ApolloProvider client={client}>
          <DecoratedWithSkip />
        </ApolloProvider>,
      ) as any;

      const decoratedWithSkip = TestUtils.findRenderedComponentWithType(
        treeWithSkip,
        DecoratedWithSkip,
      );

      expect(() => (decoratedWithSkip as any).someMethod()).toThrow();
      expect(
        (decoratedWithSkip as any).getWrappedInstance().someMethod(),
      ).toEqual(testData);
      expect(
        (decoratedWithSkip as any).refs.wrappedInstance.someMethod(),
      ).toEqual(testData);
    });
  });

  it('binds two queries to props', () => {
    const peopleQuery = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

    const shipsQuery = gql`
      query ships {
        allships(first: 1) {
          ships {
            name
          }
        }
      }
    `;
    const shipsData = { allships: { ships: [{ name: 'Tie Fighter' }] } };

    const networkInterface = mockNetworkInterface(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: shipsQuery }, result: { data: shipsData } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withShips = graphql(shipsQuery, { name: 'ships' });

    @withPeople
    @withShips
    class ContainerWithData extends React.Component<any, any> {
      render() {
        const { people, ships } = this.props;
        expect(people).toBeTruthy();
        expect(people.loading).toBe(true);

        expect(ships).toBeTruthy();
        expect(ships.loading).toBe(true);
        return null;
      }
    }

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('binds two queries to props with different syntax', () => {
    const peopleQuery = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

    const shipsQuery = gql`
      query ships {
        allships(first: 1) {
          ships {
            name
          }
        }
      }
    `;
    const shipsData = { allships: { ships: [{ name: 'Tie Fighter' }] } };

    const networkInterface = mockNetworkInterface(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: shipsQuery }, result: { data: shipsData } },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withShips = graphql(shipsQuery, { name: 'ships' });

    const ContainerWithData = withPeople(
      withShips(props => {
        const { people, ships } = props;
        expect(people).toBeTruthy();
        expect(people.loading).toBe(true);

        expect(ships).toBeTruthy();
        expect(ships.loading).toBe(true);
        return null;
      }),
    );

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('binds two operations to props', () => {
    const peopleQuery = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

    const peopleMutation = gql`
      mutation addPerson {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleMutationData = {
      allPeople: { people: [{ name: 'Leia Skywalker' }] },
    };

    const networkInterface = mockNetworkInterface(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      {
        request: { query: peopleMutation },
        result: { data: peopleMutationData },
      },
    );
    const client = new ApolloClient({ networkInterface, addTypename: false });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withPeopleMutation = graphql(peopleMutation, { name: 'addPerson' });

    @withPeople
    @withPeopleMutation
    class ContainerWithData extends React.Component<any, any> {
      render() {
        const { people, addPerson } = this.props;
        expect(people).toBeTruthy();
        expect(people.loading).toBe(true);

        expect(addPerson).toBeTruthy();
        return null;
      }
    }

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('allows a way to access the wrapped component instance', () => {
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

    const testData = { foo: 'bar' };

    class Container extends React.Component<any, any> {
      someMethod() {
        return testData;
      }

      render() {
        return <span />;
      }
    }

    const Decorated = graphql(query, { withRef: true })(Container);

    const tree = TestUtils.renderIntoDocument(
      <ApolloProvider client={client}>
        <Decorated />
      </ApolloProvider>,
    ) as any;

    const decorated = TestUtils.findRenderedComponentWithType(tree, Decorated);

    expect(() => (decorated as any).someMethod()).toThrow();
    expect((decorated as any).getWrappedInstance().someMethod()).toEqual(
      testData,
    );
    expect((decorated as any).refs.wrappedInstance.someMethod()).toEqual(
      testData,
    );

    const DecoratedWithSkip = graphql(query, { withRef: true, skip: true })(
      Container,
    );

    const treeWithSkip = TestUtils.renderIntoDocument(
      <ApolloProvider client={client}>
        <DecoratedWithSkip />
      </ApolloProvider>,
    ) as any;

    const decoratedWithSkip = TestUtils.findRenderedComponentWithType(
      treeWithSkip,
      DecoratedWithSkip,
    );

    expect(() => (decoratedWithSkip as any).someMethod()).toThrow();
    expect(
      (decoratedWithSkip as any).getWrappedInstance().someMethod(),
    ).toEqual(testData);
    expect(
      (decoratedWithSkip as any).refs.wrappedInstance.someMethod(),
    ).toEqual(testData);
  });

  it('allows options to take an object', done => {
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

    let queryExecuted;
    @graphql(query, { options: { skip: true } })
    class Container extends React.Component<any, any> {
      componentWillReceiveProps(props) {
        queryExecuted = true;
      }
      render() {
        expect(this.props.data).toBeUndefined;
        return null;
      }
    }

    renderer.create(
      <ApolloProvider client={client}>
        <Container />
      </ApolloProvider>,
    );

    setTimeout(() => {
      if (!queryExecuted) {
        done();
        return;
      }
      fail(new Error('query ran even though skip present'));
    }, 25);
  });

  describe('compose', () => {
    it('binds two queries to props with different syntax', () => {
      const peopleQuery = gql`
        query people {
          allPeople(first: 1) {
            people {
              name
            }
          }
        }
      `;
      const peopleData = {
        allPeople: { people: [{ name: 'Luke Skywalker' }] },
      };

      const shipsQuery = gql`
        query ships {
          allships(first: 1) {
            ships {
              name
            }
          }
        }
      `;
      const shipsData = { allships: { ships: [{ name: 'Tie Fighter' }] } };

      const networkInterface = mockNetworkInterface(
        { request: { query: peopleQuery }, result: { data: peopleData } },
        { request: { query: shipsQuery }, result: { data: shipsData } },
      );
      const client = new ApolloClient({ networkInterface, addTypename: false });

      const enhanced = compose(
        graphql(peopleQuery, { name: 'people' }),
        graphql(shipsQuery, { name: 'ships' }),
      );

      const ContainerWithData = enhanced(props => {
        const { people, ships } = props;
        expect(people).toBeTruthy();
        expect(people.loading).toBe(true);

        expect(ships).toBeTruthy();
        expect(ships.loading).toBe(true);
        return null;
      });

      const wrapper = renderer.create(
        <ApolloProvider client={client}>
          <ContainerWithData />
        </ApolloProvider>,
      );
      (wrapper as any).unmount();
    });
  });
});
