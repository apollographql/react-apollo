import * as chai from 'chai';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient, { createNetworkInterface, createFragment } from 'apollo-client';
import { graphql, ApolloProvider } from '../../../src';
import { getDataFromTree, renderToStringWithData } from '../../../src/server';
import 'isomorphic-fetch';
import gql from 'graphql-tag';

import mockNetworkInterface from '../../mocks/mockNetworkInterface';

const { expect } = chai;

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
    it('should run through all of the queries that want SSR', (done) => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

      const WrappedElement = graphql(query)(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).to.match(/James/);
          done();
        })
        .catch(console.error)
        ;
    });

    it('should run return the initial state for hydration', (done) => {
      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

      const WrappedElement = graphql(query)(({ data }) => (
        <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><WrappedElement /></ApolloProvider>);

      getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.data).to.exist;
          expect(initialState.apollo.data['$ROOT_QUERY.currentUser']).to.exist;
          done();
        })
        .catch(console.error)
        ;
    });

    it('should use the correct default props for a query', (done) => {
      const query = gql`query user($id: ID) { currentUser(id: $id){ firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

      const Element = graphql(query, { name: 'user' })(({ user }) => (
        <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><Element id={1} /></ApolloProvider>);

      getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.data).to.exist;
          expect(initialState.apollo.data['$ROOT_QUERY.currentUser({"id":1})']).to.exist;
          done();
        })
        .catch(console.error)
        ;
    });

    it('should allow for setting state in a component', (done) => {
      const query = gql`query user($id: ID) { currentUser(id: $id){ firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

      @graphql(query, { name: 'user' })
      class Element extends React.Component<any, any> {

        state = { thing: 1 };

        componentWillMount() {
          this.setState({ thing: this.state.thing + 1 });
        }

        render(){
          const { user } = this.props;
          expect(this.state.thing).to.equal(2);
          return <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
        }
      }

      const app = (<ApolloProvider client={apolloClient}><Element id={1} /></ApolloProvider>);

      getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.data).to.exist;
          expect(initialState.apollo.data['$ROOT_QUERY.currentUser({"id":1})']).to.exist;
          done();
        })
        .catch(console.error)
        ;
    });

    it('shouldn\'t run queries if ssr is turned to off', (done) => {
      const query = gql`query user($id: ID) { currentUser(id: $id){ firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const variables = { id: 1 };
      const networkInterface = mockNetworkInterface(
        { request: { query, variables }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

      const Element = graphql(query, {
        name: 'user',
        options: (props) => ({ variables: props, ssr: false })
      })(({ user }) => (
        <div>{user.loading ? 'loading' : user.currentUser.firstName}</div>
      ));

      const app = (<ApolloProvider client={apolloClient}><Element id={1} /></ApolloProvider>);

      getDataFromTree(app)
        .then(({ store }) => {
          const initialState = store.getState();
          expect(initialState.apollo.queries).to.be.empty;
          expect(initialState.apollo.data).to.be.empty;
          done();
        })
        .catch(console.error)
        ;
    });

    it('should correctly handle SSR mutations', (done) => {

      const query = gql`{ currentUser { firstName } }`;
      const data1 = { currentUser: { firstName: 'James' } };

      const mutation = gql`mutation { logRoutes { id } }`;
      const mutationData= { logRoutes: { id: 'foo' } };

      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data: data1 }, delay: 5 },
        { request: { query: mutation }, result: { data: mutationData }, delay: 5 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

      const withQuery = graphql(query, {
        options: (ownProps) => ({ ssr: true }),
        props: ({ data }) => {
          expect(data.refetch).to.exist;
          return {
            refetchQuery: data.refetch,
            data,
          };
        },
      });

      const withMutation = graphql(mutation, {
        props: ({ ownProps, mutate }) => {
          expect(ownProps.refetchQuery).to.exist;
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

      getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).to.match(/James/);
          done();
        })
        .catch(console.error)
        ;
    });

    it('should not require `ApolloProvider` to be the root component', (done) => {

      const query = gql`{ currentUser { firstName } }`;
      const data = { currentUser: { firstName: 'James' } };
      const networkInterface = mockNetworkInterface(
        { request: { query }, result: { data }, delay: 50 }
      );
      const apolloClient = new ApolloClient({ networkInterface });

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

      getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).to.match(/James/);
          done();
        })
        .catch(done)
        ;
    });

  });

  describe('`renderToStringWithData`', () => {

    // XXX break into smaller tests
    // XXX mock all queries
    it('should work on a non trivial example', function(done) {
      this.timeout(10000);
      const networkInterface = createNetworkInterface('http://graphql-swapi.parseapp.com/');
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

      renderToStringWithData(app)
        .then(({ markup, initialState }) => {
          expect(initialState.apollo).to.exist;
          expect(markup).to.match(/CR90 corvette/);
          expect(markup).to.match(/Return of the Jedi/);
          expect(markup).to.match(/A New Hope/);
          expect(markup).to.match(/Planets/);
          expect(markup).to.match(/Tatooine/);
          done();
        })
        .catch(done);
    });

    it('should work with queries that use fragments', function(done) {
      const query = gql`{ currentUser { ...userInfo } }`;
      const userInfoFragment = createFragment(gql`fragment userInfo on User { firstName, lastName }`);
      const data = { currentUser: { firstName: 'John', lastName: 'Smith' } };
      const networkInterface = {
        query: () => Promise.resolve({ data }),
      };
      const apolloClient = new ApolloClient({ networkInterface });

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

      renderToStringWithData(app)
          .then(({ markup }) => {
            expect(markup).to.match(/John Smith/);
            done();
          })
          .catch(done);
    });
  });
});
