import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as ReactDOM from 'react-dom/server';
import ApolloClient from 'apollo-client';
import {
  graphql,
  Query,
  ApolloProvider,
  walkTree,
  getDataFromTree,
  DataValue,
} from '../../src';
import gql from 'graphql-tag';
import * as _ from 'lodash';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../../src/test-utils';
import { ChildProps } from '../../src/types';
import { DocumentNode } from 'graphql';

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
        walkTree(rootElement, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(5);
      });

      it('basic element trees with nulls', () => {
        let elementCount = 0;
        const rootElement = <div>{null}</div>;
        walkTree(rootElement, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic element trees with false', () => {
        let elementCount = 0;
        const rootElement = <div>{false}</div>;
        walkTree(rootElement, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic element trees with empty string', () => {
        let elementCount = 0;
        const rootElement = <div>{''}</div>;
        walkTree(rootElement, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('basic element trees with arrays', () => {
        let elementCount = 0;
        const rootElement = [1, 2];
        walkTree(rootElement, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(2);
      });

      it('basic element trees with false or null', () => {
        let elementCount = 0;
        const rootElement = [1, false, null, ''];
        walkTree(rootElement, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('functional stateless components', () => {
        let elementCount = 0;
        const MyComponent = ({ n }: { n: number }) => (
          <div>{_.times(n, i => <span key={i} />)}</div>
        );
        walkTree(<MyComponent n={5} />, {}, () => {
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
        const MyComponent = ({
          n,
          children = null,
        }: {
          n: number;
          children: React.ReactNode;
        }) => (
          <div>
            {_.times(n, i => <span key={i} />)}
            {children}
          </div>
        );
        walkTree(<MyComponent n={5}>{null}</MyComponent>, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(7);
      });

      it('functional stateless components that render null', () => {
        let elementCount = 0;
        const MyComponent = () => null;
        walkTree(<MyComponent />, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(1);
      });

      it('functional stateless components that render an array', () => {
        let elementCount = 0;
        const MyComponent = () => [1, 2] as any;
        walkTree(<MyComponent />, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(3);
      });

      it('function stateless components that render with a null in array', () => {
        let elementCount = 0;

        const MyComponent = () => [null, <div />] as any;
        walkTree(<MyComponent />, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(2);
      });

      it('function stateless components that render with a undefined in array', () => {
        let elementCount = 0;

        const MyComponent = () => [undefined, <div />] as any;
        walkTree(<MyComponent />, {}, () => {
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
        walkTree(<MyComponent n={5} />, {}, () => {
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
        walkTree(<MyComponent />, {}, () => {
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
        walkTree(<MyComponent />, {}, () => {
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
        walkTree(<MyComponent />, {}, () => {
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
        walkTree(<MyComponent n={5} />, {}, () => {
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
          () => {
            elementCount += 1;
          },
        );
        expect(elementCount).toEqual(9);
      });

      it('basic classes with render on instance', () => {
        let elementCount = 0;
        class MyComponent extends (React.Component as any) {
          render = () => {
            return <div>{_.times(this.props.n, i => <span key={i} />)}</div>;
          };
        }
        const MyCompAsAny = MyComponent as any;
        walkTree(<MyCompAsAny n={5} />, {}, () => {
          elementCount += 1;
        });
        expect(elementCount).toEqual(7);
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
      const WrappedElement = graphql<Props, Data>(query)(
        ({ data }: ChildProps<Props, Data>) => (
          <div>
            {!data || data.loading || !data.currentUser
              ? 'loading'
              : data.currentUser.firstName}
          </div>
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

    it('should run through all of the queries (also defined via Query component) that want SSR', () => {
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

      interface Data {
        currentUser: {
          firstName: string;
        };
      }

      class CurrentUserQuery extends Query<Data> {}

      const WrappedElement = () => (
        <CurrentUserQuery query={query}>
          {({ data, loading }) => (
            <div>
              {loading || !data ? 'loading' : data.currentUser.firstName}
            </div>
          )}
        </CurrentUserQuery>
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
      const WrappedElement = graphql<Props, Data>(query, {
        options: { fetchPolicy: 'network-only' },
      })(({ data }: ChildProps<Props, Data>) => (
        <div>
          {!data || data.loading || !data.currentUser
            ? 'loading'
            : data.currentUser.firstName}
        </div>
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
      const WrappedElement = graphql<Props, Data>(query, {
        options: { fetchPolicy: 'cache-and-network' },
      })(({ data }: ChildProps<Props, Data>) => (
        <div>
          {!data || data.loading || !data.currentUser
            ? 'loading'
            : data.currentUser.firstName}
        </div>
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

      const WrappedElement = graphql<Props, Data>(query)(
        ({ data }: ChildProps<Props, Data>) => (
          <div>
            {!data || data.loading || !data.currentUser
              ? 'loading'
              : data.currentUser.firstName}
          </div>
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
      const idQuery: DocumentNode = gql`
        {
          currentUser {
            id
          }
        }
      `;
      const idData = { currentUser: { id: '1234' } };
      const userQuery: DocumentNode = gql`
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
      interface IdQueryData {
        currentUser: {
          id: string;
        };
      }

      interface UserQueryData {
        user: {
          firstName: string;
        };
      }

      interface UserQueryVariables {
        id: string;
      }

      type WithIdChildProps = ChildProps<Props, IdQueryData>;
      const withId = graphql<Props, IdQueryData>(idQuery);

      type WithUserChildProps = ChildProps<
        Props,
        UserQueryData,
        UserQueryVariables
      >;
      const withUser = graphql<
        WithIdChildProps,
        UserQueryData,
        UserQueryVariables
      >(userQuery, {
        skip: ({ data: { loading } }) => loading,
        options: ({ data }) => ({
          variables: { id: data!.currentUser!.id },
        }),
      });
      const Component: React.StatelessComponent<WithUserChildProps> = ({
        data,
      }) => (
        <div>
          {!data || data.loading || !data.user
            ? 'loading'
            : data.user.firstName}
        </div>
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
      const WrappedElement = graphql<Props, Data>(query)(
        ({ data }: ChildProps<Props, Data>) => (
          <div>{!data || data.loading ? 'loading' : data.error}</div>
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

    it('should merge multiple errors thrown by queries', () => {
      const idQuery = gql`
        {
          currentUser {
            id
          }
        }
      `;
      const nameQuery = gql`
        {
          currentUser {
            firstName
          }
        }
      `;
      const link = mockSingleLink(
        {
          request: { query: idQuery },
          error: new Error('Failed to fetch ID'),
          delay: 40,
        },
        {
          request: { query: nameQuery },
          error: new Error('Failed to fetch name'),
          delay: 60,
        }
      );
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({ addTypename: false }),
      });

      const withId = graphql(idQuery);
      const withName = graphql(nameQuery);

      const IdComponent = ({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.id}</div>
      );
      const NameComponent = ({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      );
      const WrappedIdComponent = withId(IdComponent);
      const WrappedNameComponent = withName(NameComponent);

      const Page = () => (
        <div>
          <WrappedIdComponent />
          <WrappedNameComponent />
        </div>
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <Page />
        </ApolloProvider>
      );

      return getDataFromTree(app).catch(e => {
        expect(e).toBeTruthy();
        expect(e.queryErrors.length).toEqual(2);
        expect(e.queryErrors[0].message).toEqual('Network error: Failed to fetch ID');
        expect(e.queryErrors[1].message).toEqual('Network error: Failed to fetch name');
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
      const WrappedElement = graphql<Props, Data>(query, {
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
      const resultData = { currentUser: { firstName: 'James' } };
      const variables = { id: '1' };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data: resultData },
        delay: 50,
      });
      const cache = new Cache({ addTypename: false });
      const apolloClient = new ApolloClient({
        link,
        cache,
      });

      interface Props {
        id: string;
      }
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      interface Variables {
        id: string;
      }
      const Element = graphql<Props, Data, Variables>(query)(
        ({ data }: ChildProps<Props, Data, Variables>) => (
          <div>
            {!data || data.loading || !data.currentUser
              ? 'loading'
              : data.currentUser.firstName}
          </div>
        ),
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={'1'} />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const initialState = cache.extract();
        expect(initialState).toBeTruthy();
        expect(
          initialState['$ROOT_QUERY.currentUser({"id":"1"})'],
        ).toBeTruthy();
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
      const resultData = { currentUser: { firstName: 'James' } };
      const variables = { id: '1' };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data: resultData },
        delay: 50,
      });

      const cache = new Cache({ addTypename: false });
      const apolloClient = new ApolloClient({
        link,
        cache,
      });

      interface Props {
        id: string;
      }
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      interface Variables {
        id: string;
      }

      class Element extends React.Component<
        ChildProps<Props, Data, Variables>,
        { thing: number }
      > {
        state = { thing: 1 };

        componentWillMount() {
          this.setState({ thing: this.state.thing + 1 });
        }

        render() {
          const { data } = this.props;
          expect(this.state.thing).toBe(2);
          return (
            <div>
              {!data || data.loading || !data.currentUser
                ? 'loading'
                : data.currentUser.firstName}
            </div>
          );
        }
      }

      const ElementWithData = graphql<Props, Data, Variables>(query)(Element);

      const app = (
        <ApolloProvider client={apolloClient}>
          <ElementWithData id={'1'} />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(() => {
          const initialState = cache.extract();
          expect(initialState).toBeTruthy();
          expect(
            initialState['$ROOT_QUERY.currentUser({"id":"1"})'],
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
      class Element extends React.Component<{}, { foo: string }> {
        constructor(props: {}) {
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
      const resultData = { currentUser: { firstName: 'James' } };
      const variables = { id: '1' };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data: resultData },
        delay: 50,
      });
      const apolloClient = new ApolloClient({
        link,
        cache: new Cache({
          addTypename: false,
        }),
      });
      interface Props {
        id: string;
      }
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      interface Variables {
        id: string;
      }

      interface State {
        thing: number;
        userId: null | number;
        client: null | ApolloClient<any>;
      }

      class Element extends React.Component<
        ChildProps<Props, Data, Variables>,
        State
      > {
        state: State = {
          thing: 1,
          userId: null,
          client: null,
        };

        componentWillMount() {
          this.setState(
            (
              state: State,
              props: Props,
              context: { client: ApolloClient<any> },
            ) =>
              ({
                thing: state.thing + 1,
                userId: props.id,
                client: context.client,
              } as any),
          );
        }

        render() {
          const { data, id } = this.props;
          expect(this.state.thing).toBe(2);
          expect(this.state.userId).toBe(id);
          expect(this.state.client).toBe(apolloClient);
          return (
            <div>
              {!data || data.loading || !data.currentUser
                ? 'loading'
                : data.currentUser.firstName}
            </div>
          );
        }
      }

      const ElementWithData = graphql<Props, Data, Variables>(query)(Element);

      const app = (
        <ApolloProvider client={apolloClient}>
          <ElementWithData id={'1'} />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(() => {
          const initialState = apolloClient.cache.extract();
          expect(initialState).toBeTruthy();
          expect(
            initialState['$ROOT_QUERY.currentUser({"id":"1"})'],
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
      const resultData = { currentUser: { firstName: 'James' } };
      const variables = { id: '1' };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data: resultData },
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

      interface Props {
        id: string;
      }
      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      interface Variables {
        id: string;
      }

      const Element = graphql<Props, Data, Variables>(query, {
        options: props => ({ variables: props, ssr: false }),
      })(({ data }) => (
        <div>
          {!data || data.loading || !data.currentUser
            ? 'loading'
            : data.currentUser.firstName}
        </div>
      ));

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={'1'} />
        </ApolloProvider>
      );

      return getDataFromTree(app).then(() => {
        const initialState = cache.extract();
        expect(initialState).toEqual({});
        expect(initialState).toEqual({});
      });
    });

    it("shouldn't run queries (via Query component) if ssr is turned to off", () => {
      const query = gql`
        query user($id: ID) {
          currentUser(id: $id) {
            firstName
          }
        }
      `;
      const resultData = { currentUser: { firstName: 'James' } };
      const variables = { id: '1' };
      const link = mockSingleLink({
        request: { query, variables },
        result: { data: resultData },
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

      class CurrentUserQuery extends Query<Data, { id: string }> {}

      const Element = (props: { id: string }) => (
        <CurrentUserQuery query={query} ssr={false} variables={props}>
          {({ data, loading }) => (
            <div>
              {loading || !data ? 'loading' : data.currentUser.firstName}
            </div>
          )}
        </CurrentUserQuery>
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <Element id={'1'} />
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

      interface Data {
        currentUser: {
          firstName: string;
        };
      }
      interface QueryProps {}
      interface QueryChildProps {
        refetchQuery: Function;
        data: DataValue<Data>;
      }

      const withQuery = graphql<QueryProps, Data, {}, QueryChildProps>(query, {
        options: () => ({ ssr: true }),
        props: ({ data }) => {
          expect(data!.refetch).toBeTruthy();
          return {
            refetchQuery: data!.refetch,
            data: data!,
          };
        },
      });

      const withMutation = graphql<
        QueryChildProps,
        {},
        {},
        { action: (variables: {}) => Promise<any> }
      >(mutation, {
        props: ({ ownProps, mutate }) => {
          expect(ownProps.refetchQuery).toBeTruthy();
          return {
            action(variables: {}) {
              return mutate!({ variables }).then(() => ownProps.refetchQuery());
            },
          };
        },
      });

      const Element: React.StatelessComponent<
        QueryChildProps & { action: (variables: {}) => Promise<any> }
      > = ({ data }) => (
        <div>
          {data.loading || !data.currentUser
            ? 'loading'
            : data.currentUser.firstName}
        </div>
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

      const Element: React.StatelessComponent<
        ChildProps<ChildProps<Props, MutationData>, QueryData, {}>
      > = ({ data }) => (
        <div>
          {!data || data.loading || !data.currentUser
            ? 'loading'
            : data.currentUser.firstName}
        </div>
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

      const WrappedElement = graphql<{}, Data>(query)(
        ({ data }: ChildProps<{}, Data>) => (
          <div>
            {!data || data.loading || !data.currentUser
              ? 'loading'
              : data.currentUser.firstName}
          </div>
        ),
      );

      class MyRootContainer extends React.Component<{}, { color: string }> {
        constructor(props: {}) {
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
