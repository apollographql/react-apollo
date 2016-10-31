import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient, { createNetworkInterface, createFragment } from 'apollo-client';
import { graphql, ApolloProvider } from '../../../src';
import { getDataFromTree, renderToStringWithData } from '../../../src/server';
import 'isomorphic-fetch';
import gql from 'graphql-tag';

import { mockNetworkInterface } from '../../../src/test-utils';

describe('SSR', () => {
  // it('should render the expected markup', (done) => {

  //   const query = gql`query ssr { allPeople(first: 1) { people { name } } }`;
  //   const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
  //   const networkInterface = mockNetworkInterface({ request: { query }, result: { data } });
  //   const client = new ApolloClient({ networkInterface });

  //   const Element = ({ ssr }) => (<div>{ssr.loading ? 'loading' : 'loaded'}</div>);
  //   const WrappedElement = graphql(query)(Element);
  //   const component = (<ApolloProvider client={client}><WrappedElement /></ApolloProvider>);

  //   try {
  //     const markup = ReactDOM.renderToString(component);
  //     expect(markup).to.match(/loading/);
  //     // We do a timeout to ensure the rest of the application does not fail
  //     // after the render
  //     setTimeout(() => done(), 10);
  //   } catch (e) {
  //     done(e);
  //   }
  // });

  describe('`getDataFromTree`', () => {
    it('should run through all of the queries that want SSR', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query)(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        });
    });

    it('should allow forceFetch as an option and still render prefetched data', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query, { options: { forceFetch: true }})(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        });
    });

    it('should pick up queries deep in the render tree', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query)(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const Page = () => (<div><span>Hi</span><div><WrappedElement /></div></div>);

      const app = (<ApolloProvider client={apolloClient}><Page/></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        });
    });

    it('should handle nested queries that depend on each other', () => {
      const idQuery = gql`{ currentUser { id } }`;
      const idData = { currentUser: { id: '1234' } };
      const userQuery = gql`query getUser($id: String) { user(id: $id) { firstName } }`;
      const variables = { id: '1234' };
      const userData = { user: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query: idQuery }, result: { data: idData }, delay: 50 },
        { request: { query: userQuery, variables }, result: { data: userData }, delay: 50 },
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const withId = graphql(idQuery);
      const withUser = graphql(userQuery, {
        skip: ({ data: { loading } }) => loading,
        options: ({ data }) => ({ variables: { id: data.currentUser.id } }),
      });
      const Component = ({ data }) => (
        <div>{data.loading ? 'loading' : data.user.firstName}</div>
      );
      const WrappedComponent = withId(withUser(Component));

      const app = (<ApolloProvider client={apolloClient}><WrappedComponent /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        });
    });

    it('should correctly skip queries (deprecated)', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query, { options: { skip: true }})(({ data }) => (
        <div>{data.loading ? 'loading' : 'skipped'}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/skipped/);
        })
        ;
    });

    it('should correctly skip queries (deprecated)', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query, { skip: true })(({ data }) => (
        <div>{!data ? 'skipped' : 'dang'}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/skipped/);
        })
        ;
    });

    it('should run return the initial state for hydration', () => {
      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query)(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.data).toBeTruthy();
          expect(initialState.apollo.data['$ROOT_QUERY.currentUser']).toBeTruthy();
        })
        ;
    });

    it('should use the correct default props for a query', () => {
      const query = gql`query user($id: ID) { currentUser(id: $id){ firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const Element = graphql(query, { name: 'user' })(({ user }) => (
        <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><Element id={1} /></ApolloProvider>);

      return getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.data).toBeTruthy();
          expect(initialState.apollo.data['$ROOT_QUERY.currentUser({"id":1})']).toBeTruthy();
        })
        ;
    });

    it('should allow for setting state in a component', (done) => {
      const query = gql`query user($id: ID) { currentUser(id: $id){ firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      @graphql(query, { name: 'user' })
      class Element extends React.Component<any, any> {

        state = { thing: 1 };

        componentWillMount() {
          this.setState({ thing: this.state.thing + 1 });
        }

        render(){
          const { user } = this.props;
          expect(this.state.thing).toBe(2);
          return <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
        }
      }

      const app = (<ApolloProvider client={apolloClient}><Element id={1} /></ApolloProvider>);

      getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.data).toBeTruthy();
          expect(initialState.apollo.data['$ROOT_QUERY.currentUser({"id":1})']).toBeTruthy();
          done();
        })
        .catch(console.error)
        ;
    });

    it('shouldn\'t run queries if ssr is turned to off', () => {
      const query = gql`query user($id: ID) { currentUser(id: $id){ firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const Element = graphql(query, {
        name: 'user',
        options: (props) => ({ variables: props, ssr: false })
      })(({ user }) => (
        <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><Element id={1} /></ApolloProvider>);

      return getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.queries).toEqual({});
          expect(initialState.apollo.data).toEqual({});
        })
        ;
    });

    it('should correctly handle SSR mutations', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data1 = { currentUser: { firstName: 'James' } };

      const mutation = gql`mutation { logRoutes { id } }`;
      const mutationData= { logRoutes: { id: 'foo' } };

      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data: data1 }, delay: 5 },
        { request: { query: mutation }, result: { data: mutationData }, delay: 5 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const withQuery = graphql(query, {
        options: (ownProps) => ({ ssr: true }),
        props: ({ data }) => {
          expect(data.refetch).toBeTruthy();
          return {
            refetchQuery: data.refetch,
            data,
          };
        },
      });

      const withMutation = graphql(mutation, {
        props: ({ ownProps, mutate }) => {
          expect(ownProps.refetchQuery).toBeTruthy();
          return {
            action(variables) {
              return mutate({ variables }).then(() => ownProps.refetchQuery());
            },
          };
        },
      });

      const Element = (({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const WrappedElement = withQuery(withMutation(Element));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        })
        ;
    });

    it('should correctly handle SSR mutations, reverse order', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data1 = { currentUser: { firstName: 'James' } };

      const mutation = gql`mutation { logRoutes { id } }`;
      const mutationData= { logRoutes: { id: 'foo' } };

      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data: data1 }, delay: 5 },
        { request: { query: mutation }, result: { data: mutationData }, delay: 5 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const withQuery = graphql(query, {
        props: ({ ownProps, data }) => {
          expect(ownProps.mutate).toBeTruthy();
          return {
            data,
          };
        },
      });

      const withMutation = graphql(mutation);
      const Element = (({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const WrappedElement = withMutation(withQuery(Element));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        })
        ;
    });

    it('should not require `ApolloProvider` to be the root component', () => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const WrappedElement = graphql(query)(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

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
        color: React.PropTypes.string,
      };

      const app = (
        <MyRootContainer>
          <ApolloProvider client={apolloClient}>
            <WrappedElement />
          </ApolloProvider>
        </MyRootContainer>
      );

      return getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).toMatch(/James/);
        })
        ;
    });

  });

  describe('`renderToStringWithData`', () => {

    // XXX break into smaller tests
    // XXX mock all queries
    it('should work on a non trivial example', function() {
      // this.timeout(10000);
      const networkInterface = createNetworkInterface({
        uri: 'http://graphql-swapi.parseapp.com/',
      });
      const apolloClient = new ApolloClient({ networkInterface });

      @graphql(gql`
        query data($id: ID!) { film: node(id: $id) { ... on Film { title } } }
      `)
      class Film extends React.Component<any, any> {
        render() {
          const { data } = this.props;
          if (data.loading) return null;
          const { film } = data;
          return <h6>{film.title}</h6>;
        }
      };

      @graphql(gql`
        query data($id: ID!) {
          ship: node(id: $id) { ... on Starship { name, filmConnection { films { id } } } }
        }
      `)
      class Starship extends React.Component<any, any> {
        render() {
          const { data } = this.props;
          if (data.loading) return null;
          const { ship } = data;
          return (
            <div>
              <h4>{ship.name} appeared in the following flims:</h4>
              <br/>
              <ul>
                {ship.filmConnection.films.map((film, key) => (
                  <li key={key}>
                    <Film id={film.id} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }
      };


      @graphql(gql`query data { allStarships(first: 2) { starships { id } } }`)
      class AllShips extends React.Component<any, any> {
        render() {
          const { data } = this.props;
          return (
            <ul>
              {!data.loading && data.allStarships && data.allStarships.starships.map((ship, key) => (
                <li key={key}><Starship id={ship.id} /></li>
              ))}
            </ul>
          );
        }
      }


      @graphql(gql`query data { allPlanets(first: 1) { planets { name } } }`)
      class AllPlanets extends React.Component<any, any> {
        render() {
          const { data } = this.props;
          if (data.loading) return null;
          const { planets } = data.allPlanets;
          return (
            <div>
              <h1>Planets</h1>
              {planets.map((planet, key) => (
                <div key={key}>{planet.name}</div>
              ))}
            </div>
          );
        }
      }


      const Bar = () => (<div><h2>Bar</h2><AllPlanets /></div>)
      const Foo = () => (<div><h1>Foo</h1><Bar /></div>);

      const app = (
        <ApolloProvider client={apolloClient}>
          <div>
            <Foo />
            <hr />
            <AllShips />
          </div>
        </ApolloProvider>
      );

      return renderToStringWithData(app)
        .then(({ markup, initialState }) => {
          expect(initialState.apollo).toBeTruthy();
          expect(markup).toMatch(/CR90 corvette/);
          expect(markup).toMatch(/Return of the Jedi/);
          expect(markup).toMatch(/A New Hope/);
          expect(markup).toMatch(/Planets/);
          expect(markup).toMatch(/Tatooine/);
        });
    });

    it('should work with queries that use fragments', function() {
      const query = gql`{ currentUser { __typename, ...userInfo } }`;
      const userInfoFragment = createFragment(gql`fragment userInfo on User { firstName, lastName }`);
      const data = { currentUser: { __typename: 'User', firstName: 'John', lastName: 'Smith' } };
      const networkInterface = {
        query: () => Promise.resolve({ data }),
      };
      const apolloClient = new ApolloClient({ networkInterface, addTypename: false });

      const UserPage = graphql(query, {
        options: {
          fragments: userInfoFragment
        }
      })(({ data }) => (
          <div>{data.loading ? 'Loading...' : `${data.currentUser.firstName} ${data.currentUser.lastName}`}</div>
      ));

      const app = (
          <ApolloProvider client={apolloClient}>
            <UserPage />
          </ApolloProvider>
      );

      return renderToStringWithData(app)
          .then(({ markup }) => {
            expect(markup).toMatch(/John Smith/);
          })
    });
  });
});
