import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloLink } from 'apollo-link';
import { mockSingleLink } from '../../../src/test-utils';
import { ApolloProvider, ChildProps, DataValue, graphql, withApollo } from '../../../src';
import * as TestUtils from 'react-dom/test-utils';
import { DocumentNode } from 'graphql';

const compose = require('lodash/flowRight');

describe('shared operations', () => {
  describe('withApollo', () => {
    it('passes apollo-client to props', () => {
      const client = new ApolloClient({
        link: new ApolloLink((o, f) => (f ? f(o) : null)),
        cache: new Cache(),
      });

      @withApollo
      class ContainerWithData extends React.Component<any> {
        render(): React.ReactNode {
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
      const client = new ApolloClient({
        link: new ApolloLink((o, f) => (f ? f(o) : null)),
        cache: new Cache(),
      });

      const testData = { foo: 'bar' };

      class Container extends React.Component<any> {
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

      const decorated = TestUtils.findRenderedComponentWithType(tree, Decorated);

      expect(() => (decorated as any).someMethod()).toThrow();
      expect((decorated as any).getWrappedInstance().someMethod()).toEqual(testData);
      expect((decorated as any).wrappedInstance.someMethod()).toEqual(testData);

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
      expect((decoratedWithSkip as any).getWrappedInstance().someMethod()).toEqual(testData);
      expect((decoratedWithSkip as any).wrappedInstance.someMethod()).toEqual(testData);
    });
  });

  it('binds two queries to props', () => {
    const peopleQuery: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    interface PeopleData {
      allPeople: { people: [{ name: string }] };
    }

    const shipsQuery: DocumentNode = gql`
      query ships {
        allships(first: 1) {
          ships {
            name
          }
        }
      }
    `;
    const shipsData = { allships: { ships: [{ name: 'Tie Fighter' }] } };
    interface ShipsData {
      allShips: { ships: [{ name: string }] };
    }

    const link = mockSingleLink(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: shipsQuery }, result: { data: shipsData } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface PeopleChildProps {
      people: DataValue<PeopleData>;
    }

    // Since we want to test decorators usage, and this does not play well with Typescript,
    // we resort to setting everything as any to avoid type checking.
    const withPeople: any = graphql<{}, PeopleData, {}, PeopleChildProps>(peopleQuery, {
      name: 'people',
    });

    interface ShipsChildProps {
      ships: DataValue<PeopleData>;
    }
    const withShips: any = graphql<{}, ShipsData, {}, ShipsChildProps>(shipsQuery, {
      name: 'ships',
    });

    @withPeople
    @withShips
    class ContainerWithData extends React.Component<any> {
      render() {
        const { people, ships } = this.props;
        expect(people).toBeTruthy();
        expect(people.loading).toBeTruthy();

        expect(ships).toBeTruthy();
        expect(ships.loading).toBeTruthy();
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
    const peopleQuery: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    interface PeopleData {
      allPeople: { people: [{ name: string }] };
    }
    const shipsQuery: DocumentNode = gql`
      query ships {
        allships(first: 1) {
          ships {
            name
          }
        }
      }
    `;
    const shipsData = { allships: { ships: [{ name: 'Tie Fighter' }] } };
    interface ShipsData {
      allShips: { ships: [{ name: string }] };
    }

    const link = mockSingleLink(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      { request: { query: shipsQuery }, result: { data: shipsData } },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    interface PeopleChildProps {
      people: DataValue<PeopleData>;
    }

    const withPeople = graphql<{}, PeopleData, {}, PeopleChildProps>(peopleQuery, {
      name: 'people',
    });

    interface ShipsAndPeopleChildProps extends PeopleChildProps {
      ships: DataValue<PeopleData>;
    }
    const withShips = graphql<PeopleChildProps, ShipsData, {}, ShipsAndPeopleChildProps>(
      shipsQuery,
      {
        name: 'ships',
      },
    );

    const ContainerWithData = withPeople(
      withShips((props: ShipsAndPeopleChildProps) => {
        const { people, ships } = props;
        expect(people).toBeTruthy();
        expect(people.loading).toBeTruthy();

        expect(ships).toBeTruthy();
        expect(ships.loading).toBeTruthy();
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
    const peopleQuery: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const peopleData = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };

    const peopleMutation: DocumentNode = gql`
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

    const link = mockSingleLink(
      { request: { query: peopleQuery }, result: { data: peopleData } },
      {
        request: { query: peopleMutation },
        result: { data: peopleMutationData },
      },
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    const withPeople = graphql(peopleQuery, { name: 'people' });
    const withPeopleMutation = graphql(peopleMutation, { name: 'addPerson' });

    const ContainerWithData = withPeople(
      withPeopleMutation(
        class extends React.Component<any> {
          render() {
            const { people, addPerson } = this.props;
            expect(people).toBeTruthy();
            expect(people.loading).toBeTruthy();

            expect(addPerson).toBeTruthy();
            return null;
          }
        },
      ),
    );

    const wrapper = renderer.create(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>,
    );
    (wrapper as any).unmount();
  });

  it('allows a way to access the wrapped component instance', () => {
    const query: DocumentNode = gql`
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
    expect((decorated as any).getWrappedInstance().someMethod()).toEqual(testData);
    expect((decorated as any).wrappedInstance.someMethod()).toEqual(testData);

    const DecoratedWithSkip = graphql(query, { withRef: true, skip: true })(Container);

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
    expect((decoratedWithSkip as any).getWrappedInstance().someMethod()).toEqual(testData);
    expect((decoratedWithSkip as any).wrappedInstance.someMethod()).toEqual(testData);
  });

  it('allows options to take an object', done => {
    const query: DocumentNode = gql`
      query people {
        allPeople(first: 1) {
          people {
            name
          }
        }
      }
    `;
    const data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
    type Data = typeof data;

    const link = mockSingleLink({
      request: { query },
      result: { data },
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false }),
    });

    let queryExecuted = false;
    const Container = graphql<{}, Data>(query, { skip: true })(
      class extends React.Component<ChildProps<{}, Data>> {
        componentWillReceiveProps() {
          queryExecuted = true;
        }
        render() {
          expect(this.props.data).toBeUndefined();
          return null;
        }
      },
    );

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
      const peopleQuery: DocumentNode = gql`
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

      type PeopleData = typeof peopleData;

      const shipsQuery: DocumentNode = gql`
        query ships {
          allships(first: 1) {
            ships {
              name
            }
          }
        }
      `;
      const shipsData = { allships: { ships: [{ name: 'Tie Fighter' }] } };

      type ShipsData = typeof shipsData;

      const link = mockSingleLink(
        { request: { query: peopleQuery }, result: { data: peopleData } },
        { request: { query: shipsQuery }, result: { data: shipsData } },
      );
      const client = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface PeopleChildProps {
        people: DataValue<PeopleData>;
      }

      interface ShipsAndPeopleChildProps {
        people: DataValue<PeopleData>;
        ships: DataValue<PeopleData>;
      }

      const enhanced = compose(
        graphql<{}, PeopleData, {}, PeopleChildProps>(peopleQuery, {
          name: 'people',
        }),
        graphql<PeopleChildProps, ShipsData, {}, ShipsAndPeopleChildProps>(shipsQuery, {
          name: 'ships',
        }),
      );

      const ContainerWithData = enhanced((props: ShipsAndPeopleChildProps) => {
        const { people, ships } = props;
        expect(people).toBeTruthy();
        expect(people.loading).toBeTruthy();

        expect(ships).toBeTruthy();
        expect(ships.loading).toBeTruthy();
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
