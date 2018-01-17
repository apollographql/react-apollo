import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom/server';
import ApolloClient from 'apollo-client';
import {
  graphql,
  ApolloProvider,
  DataValue,
  walkTree,
  getDataFromTree,
} from '../../src';
import gql from 'graphql-tag';
import * as _ from 'lodash';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../src/test-utils';
import { ChildProps } from '../../src/types';

describe('SSR', () => {
  describe('`walkTree`', () => {
    describe('traversal', () => {
      it('basic element trees', () => {
        let elementCount = 0;
        const rootElement = (
          <div>
            <span>Foo</span>
            <span>Bar</span>
          </div>
        );
        walkTree(rootElement, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(5);
      });

      it('basic element trees with nulls', () => {
        let elementCount = 0;
        const rootElement = <div>{null}</div>;
        walkTree(rootElement, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic element trees with false', () => {
        let elementCount = 0;
        const rootElement = <div>{false}</div>;
        walkTree(rootElement, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic element trees with empty string', () => {
        let elementCount = 0;
        const rootElement = <div>{''}</div>;
        walkTree(rootElement, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic element trees with arrays', () => {
        let elementCount = 0;
        const rootElement = [1, 2];
        walkTree(rootElement, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(2);
      });

      it('basic element trees with false or null', () => {
        let elementCount = 0;
        const rootElement = [1, false, null, ''];
        walkTree(rootElement, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('functional stateless components', () => {
        let elementCount = 0;
        const MyComponent = ({ n }) => (
          <div>{_.times(n, i => <span key={i} />)}</div>
        );
        walkTree(<MyComponent n={5} />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(7);
      });

      it('functional stateless components with children', () => {
        let elementCount = 0;
        let isPreact = false;
        interface Props {
          n: number;
          children?: React.ReactNode;
        }
        const MyComponent = ({ n, children }: Props) => (
          <div>
            {_.times(n, i => <span key={i} />)}
            {children}
          </div>
        );
        walkTree(
          <MyComponent n={5}>
            <span>Foo</span>
          </MyComponent>,
          {},
          element => {
            if (element && (element as any).preactCompatUpgraded) {
              isPreact = true;
            }
            elementCount += 1;
          },
        );
        // preact does a slightly different pass than react does here
        // fwiw, preact's seems to make sense here (7 nodes vs 9)
        // XXX verify markup checksums on this
        if (isPreact) {
          expect(elementCount).toEqual(7);
        } else {
          expect(elementCount).toEqual(9);
        }
      });

      it('functional stateless components with null children', () => {
        let elementCount = 0;
        const MyComponent = ({ n, children = null }) => (
          <div>
            {_.times(n, i => <span key={i} />)}
            {children}
          </div>
        );
        walkTree(<MyComponent n={5}>{null}</MyComponent>, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(7);
      });

      it('functional stateless components that render null', () => {
        let elementCount = 0;
        const MyComponent = () => null;
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('functional stateless components that render an array', () => {
        let elementCount = 0;
        const MyComponent = () => [1, 2] as any;
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(3);
      });

      it('function stateless components that render with a null in array', () => {
        let elementCount = 0;

        const MyComponent = () => [null, <div />] as any;
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(2);
      });

      it('function stateless components that render with a undefined in array', () => {
        let elementCount = 0;

        const MyComponent = () => [undefined, <div />] as any;
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(2);
      });

      it('basic classes', () => {
        let elementCount = 0;
        class MyComponent extends React.Component<any, any> {
          render() {
            return <div>{_.times(this.props.n, i => <span key={i} />)}</div>;
          }
        }
        walkTree(<MyComponent n={5} />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(7);
      });

      it('basic classes components that render null', () => {
        let elementCount = 0;
        class MyComponent extends React.Component<any, any> {
          render() {
            return null;
          }
        }
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic classes components that render an array', () => {
        let elementCount = 0;
        class MyComponent extends React.Component<any, any> {
          render() {
            return [1, 2];
          }
        }
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(3);
      });

      it('basic classes components that render with a null in array', () => {
        let elementCount = 0;

        class MyComponent extends React.Component<any> {
          render() {
            return [null, <div />];
          }
        }
        walkTree(<MyComponent />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(2);
      });

      it('basic classes with incomplete constructors', () => {
        let elementCount = 0;
        class MyComponent extends React.Component<any> {
          constructor() {
            super(null); // note doesn't pass props or context
          }
          render() {
            return <div>{_.times(this.props.n, i => <span key={i} />)}</div>;
          }
        }
        walkTree(<MyComponent n={5} />, {}, element => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(7);
      });

      it('basic classes with children', () => {
        let elementCount = 0;
        class MyComponent extends React.Component<any, any> {
          render() {
            return (
              <div>
                {_.times(this.props.n, i => <span key={i} />)}
                {this.props.children}
              </div>
            );
          }
        }
        walkTree(
          <MyComponent n={5}>
            <span>Foo</span>
          </MyComponent>,
          {},
          element => {
            elementCount += 1;
          },
        );
        expect(elementCount).toEqual(9);
      });
    });
  });

  describe('`getDataFromTree`', () => {
    it('should run through all of the queries that want SSR', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const data1 = { currentUser: { firstName: 'James' } };
      const link = mockSingleLink({
        request: { query },
        result: { data: data1 },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      const WrappedElement = graphql(query)(
        ({ data }: ChildProps<Props, Data>) => (
          <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
        ),
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should allow network-only fetchPolicy as an option and still render prefetched data', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const link = mockSingleLink({
        request: { query },
        result: { data: { currentUser: { firstName: 'James' } } },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      const WrappedElement = graphql(query, {
        options: { fetchPolicy: 'network-only' },
      })(({ data }: ChildProps<Props, Data>) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should allow cache-and-network fetchPolicy as an option and still render prefetched data', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const link = mockSingleLink({
        request: { query },
        result: { data: { currentUser: { firstName: 'James' } } },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      const WrappedElement = graphql(query, {
        options: { fetchPolicy: 'cache-and-network' },
      })(({ data }: ChildProps<Props, Data>) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should pick up queries deep in the render tree', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const link = mockSingleLink({
        request: { query },
        result: { data: { currentUser: { firstName: 'James' } } },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }

      const WrappedElement = graphql(query)(
        ({ data }: ChildProps<Props, Data>) => (
          <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
        ),
      );

      const Page = () => (
        <div>
          <span>Hi</span>
          <div>
            <WrappedElement />
          </div>
        </div>
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <Page />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should handle nested queries that depend on each other', () => {
      const idQuery = gql`
        {
          currentUser {
            id
          }
        }
      `;
      const idData = { currentUser: { id: '1234' } };
      const userQuery = gql`
        query getUser($id: String) {
          user(id: $id) {
            firstName
          }
        }
      `;
      const variables = { id: '1234' };
      const userData = { user: { firstName: 'James' } };
      const link = mockSingleLink(
        { request: { query: idQuery }, result: { data: idData }, delay: 50 },
        {
          request: { query: userQuery, variables },
          result: { data: userData },
          delay: 50,
        },
      );
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          id: string;
        };
      }

      const withId = graphql(idQuery);
      const withUser = graphql(userQuery, {
        skip: ({ data: { loading } }) => loading,
        options: ({ data }: ChildProps<Props, Data>) => ({
          variables: { id: data.currentUser.id },
        }),
      });
      const Component = ({ data }) => (
        <div>{data.loading ? 'loading' : data.user.firstName}</div>
      );
      const WrappedComponent = withId(withUser(Component));

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedComponent />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should handle errors thrown by queries', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const link = mockSingleLink({
        request: { query },
        error: new Error('Failed to fetch'),
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      const WrappedElement = graphql(query)(
        ({ data }: ChildProps<Props, Data>) => (
          <div>{data.loading ? 'loading' : data.error}</div>
        ),
      );

      const Page = () => (
        <div>
          <span>Hi</span>
          <div>
            <WrappedElement />
          </div>
        </div>
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <Page />
        </ApolloProvider>
      );

      return getDataFromTree(app).catch(e => {
        expect(e).toBeTruthy();
        expect(e.queryErrors.length).toEqual(1);

        // But we can still render the app if we want to
        const markup = ReactDOM.renderToString(app);
        // It renders in a loading state as errored query isn't shared between
        // the query fetching run and the rendering run.
        expect(markup).toMatch(/loading/);
      });
    });

    it('should correctly skip queries (deprecated)', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const link = mockSingleLink({
        request: { query },
        result: { data: { currentUser: { firstName: 'James' } } },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      const WrappedElement = graphql(query, {
        skip: true,
      })(({ data }: ChildProps<Props, Data>) => (
        <div>{!data ? 'skipped' : 'dang'}</div>
      ));

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/skipped/);
      });
    });

    it('should use the correct default props for a query', () => {
      const query = gql`
        query user($id: ID) {
          currentUser(id: $id) {
            firstName
          }
        }
      `;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data },
        delay: 50,
      });
      const cache = new Cache({ addTypename: false });
      const apolloClient = new ApolloClient({
        link,
        cache,
      });

      interface Props {}
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      const Element = graphql(query, {
        name: 'user',
      })(({ user }: ChildProps<Props, Data> & { user: DataValue<Data> }) => (
        <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
      ));

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={1} />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const initialState = cache.extract();
        expect(initialState).toBeTruthy();
        expect(initialState['$ROOT_QUERY.currentUser({"id":1})']).toBeTruthy();
      });
    });

    it('should allow for setting state in a component', done => {
      const query = gql`
        query user($id: ID) {
          currentUser(id: $id) {
            firstName
          }
        }
      `;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data },
        delay: 50,
      });

      const cache = new Cache({ addTypename: false });
      const apolloClient = new ApolloClient({
        link,
        cache,
      });

      @graphql(query, { name: 'user' })
      class Element extends React.Component<any, any> {
        state = { thing: 1 };

        componentWillMount() {
          this.setState({ thing: this.state.thing + 1 });
        }

        render() {
          const { user } = this.props;
          expect(this.state.thing).toBe(2);
          return (
            <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
          );
        }
      }

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={1} />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(() => {
          const initialState = cache.extract();
          expect(initialState).toBeTruthy();
          expect(
            initialState['$ROOT_QUERY.currentUser({"id":1})'],
          ).toBeTruthy();
          done();
        })
        .catch(console.error);
    });

    it('should correctly initialize an empty state to null', () => {
      class Element extends React.Component<any, any> {
        render() {
          // this is a check for how react and preact differ. Preact (nicely)
          // comes with a default state
          if ((this as any).__d) {
            // I'm preact
            expect(this.state).toEqual({});
          } else {
            expect(this.state).toBeNull();
          }
          return null;
        }
      }

      return getDataFromTree(<Element />);
    });

    it('should maintain any state set in the element constructor', () => {
      class Element extends React.Component<any, any> {
        s;
        constructor(props) {
          super(props);
          this.state = { foo: 'bar' };
        }

        render() {
          expect(this.state).toEqual({ foo: 'bar' });
          return null;
        }
      }

      return getDataFromTree(<Element />);
    });

    it('should allow for setting state via an updater function', done => {
      const query = gql`
        query user($id: ID) {
          currentUser(id: $id) {
            firstName
          }
        }
      `;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({
          addTypename: false,
        }),
      });
      interface Props {
        id: number;
      }
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      interface State {
        thing: number;
        userId: number;
        client: null | any;
      }

      @graphql(query, { name: 'user' })
      class Element extends React.Component<
        ChildProps<Props, Data> & { user?: DataValue<Data> },
        State
      > {
        state: State = {
          thing: 1,
          userId: null,
          client: null,
        };

        componentWillMount() {
          this.setState(
            (state, props, context) =>
              ({
                thing: state.thing + 1,
                userId: props.id,
                client: context.client,
              } as any),
          );
        }

        render() {
          const { user, id } = this.props;
          expect(this.state.thing).toBe(2);
          expect(this.state.userId).toBe(id);
          expect(this.state.client).toBe(apolloClient);
          return (
            <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
          );
        }
      }

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={1} />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(() => {
          const initialState = apolloClient.cache.extract();
          expect(initialState).toBeTruthy();
          expect(
            initialState['$ROOT_QUERY.currentUser({"id":1})'],
          ).toBeTruthy();
          done();
        })
        .catch(console.error);
    });

    it("shouldn't run queries if ssr is turned to off", () => {
      const query = gql`
        query user($id: ID) {
          currentUser(id: $id) {
            firstName
          }
        }
      `;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data },
        delay: 50,
      });

      const cache = new Cache({ addTypename: false });
      const apolloClient = new ApolloClient({
        link,
        cache,
      });

      interface Data {
        currentUser: {
          firstName: string;
        };
      }

      const Element = graphql(query, {
        name: 'user',
        options: props => ({ variables: props, ssr: false }),
      })(({ user }: { user?: DataValue<Data> }) => (
        <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
      ));

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={1} />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const initialState = cache.extract();
        expect(initialState).toEqual({});
        expect(initialState).toEqual({});
      });
    });

    it('should correctly handle SSR mutations', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const data1 = { currentUser: { firstName: 'James' } };

      const mutation = gql`
        mutation {
          logRoutes {
            id
          }
        }
      `;
      const mutationData = { logRoutes: { id: 'foo' } };

      const link = mockSingleLink(
        { request: { query }, result: { data: data1 }, delay: 5 },
        {
          request: { query: mutation },
          result: { data: mutationData },
          delay: 5,
        },
      );
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      interface Data {}
      interface QueryProps {}
      const withQuery = graphql<QueryProps>(query, {
        options: ownProps => ({ ssr: true }),
        props: ({ data }) => {
          expect(data.refetch).toBeTruthy();
          return {
            refetchQuery: data.refetch,
            data,
          };
        },
      });

      interface MutationProps {
        refetchQuery: Function;
        data: Data;
      }
      const withMutation = graphql<MutationProps>(mutation, {
        props: ({ ownProps, mutate }) => {
          expect(ownProps.refetchQuery).toBeTruthy();
          return {
            action(variables) {
              return mutate({ variables }).then(() => ownProps.refetchQuery());
            },
          };
        },
      });

      const Element = ({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      );

      const WrappedElement = withQuery(withMutation(Element));

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should correctly handle SSR mutations, reverse order', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;

      interface Props {}
      interface QueryData {
        currentUser: {
          firstName: string;
        };
      }

      const mutation = gql`
        mutation {
          logRoutes {
            id
          }
        }
      `;
      interface MutationData {
        logRoutes: {
          id: string;
        };
      }

      const link = mockSingleLink(
        {
          request: { query },
          result: { data: { currentUser: { firstName: 'James' } } },
          delay: 5,
        },
        {
          request: { query: mutation },
          result: { data: { logRoutes: { id: 'foo' } } },
          delay: 5,
        },
      );
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const withMutation = graphql<Props, MutationData>(mutation);
      const withQuery = graphql<
        Props & ChildProps<Props, MutationData>,
        QueryData
      >(query, {
        props: ({ ownProps, data }) => {
          expect(ownProps.mutate).toBeTruthy();
          return {
            data,
          };
        },
      });

      const Element = ({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      );

      const WrappedElement = withMutation(withQuery(Element));

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });

    it('should not require `ApolloProvider` to be the root component', () => {
      const query = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      interface Data {
        currentUser: {
          firstName: string;
        };
      }

      const link = mockSingleLink({
        request: { query },
        result: { data: { currentUser: { firstName: 'James' } } },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const WrappedElement = graphql(query)(
        ({ data }: ChildProps<{}, Data>) => (
          <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
        ),
      );

      class MyRootContainer extends React.Component<any, any> {
        constructor(props) {
          super(props);
          this.state = { color: 'purple' };
        }

        getChildContext() {
          return { color: this.state.color };
        }

        render() {
          return <div>{this.props.children}</div>;
        }
      }

      (MyRootContainer as any).childContextTypes = {
        color: PropTypes.string,
      };

      const app = (
        <MyRootContainer>
          <ApolloProvider client={apolloClient}>
            <WrappedElement />
          </ApolloProvider>
        </MyRootContainer>
      );

      return getDataFromTree(app).then(() => {
        const markup = ReactDOM.renderToString(app);
        expect(markup).toMatch(/James/);
      });
    });
  });
});
