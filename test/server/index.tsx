import * as chai from 'chai';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { connect, ApolloProvider } from '../../src';
import { getDataFromTree, renderToStringWithData } from '../../src/server';
import 'isomorphic-fetch';

import gql from 'graphql-tag';

import mockNetworkInterface from '../mocks/mockNetworkInterface';

const { expect } = chai;

const client = new ApolloClient({
  networkInterface: createNetworkInterface('https://www.graphqlhub.com/playground'),
});

describe('SSR', () => {
  it('should render the expected markup', (done) => {
    const Element = ({ data }) => {
      return <div>{data.loading ? 'loading' : 'loaded'}</div>;
    };

    const WrappedElement = connect({
      mapQueriesToProps: () => ({
        data: {
          query: gql`
            query Feed {
              currentUser {
                login
              }
            }
          `,
        },
      }),
    })(Element);

    const component = (
      <ApolloProvider client={client}>
        <WrappedElement />
      </ApolloProvider>
    );

    try {
      const data = ReactDOM.renderToString(component);
      expect(data).to.match(/loading/);
      // We do a timeout to ensure the rest of the application does not fail
      // after the render
      setTimeout(() => {
        done();
      }, 1000);
    } catch (e) {
      done(e);
    }
  });

  describe('`getDataFromTree`', () => {
    it('should run through all of the queries that want SSR', (done) => {
      const Element = ({ data }) => {
        return <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>;
      };

      const query = gql`
        query App {
          currentUser {
            firstName
          }
        }
      `;

      const data = {
        currentUser: {
          firstName: 'James',
        },
      };

      const networkInterface = mockNetworkInterface(
        {
          request: { query },
          result: { data },
          delay: 50,
        }
      );

      const apolloClient = new ApolloClient({
        networkInterface,
      });

      const WrappedElement = connect({
        mapQueriesToProps: () => ({
          data: {
            query,
            ssr: true, // block during SSR render
          },
        }),
      })(Element);

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(() => {
          const markup = ReactDOM.renderToString(app);
          expect(markup).to.match(/James/);
          done();
        });
    });

    it('should run return the initial state for hydration', (done) => {
      const Element = ({ data }) => {
        return <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>;
      };

      const query = gql`
        query App {
          currentUser {
            firstName
          }
        }
      `;

      const data = {
        currentUser: {
          firstName: 'James',
        },
      };

      const networkInterface = mockNetworkInterface(
        {
          request: { query },
          result: { data },
          delay: 50,
        }
      );

      const apolloClient = new ApolloClient({
        networkInterface,
      });

      const WrappedElement = connect({
        mapQueriesToProps: () => ({
          data: { query },
        }),
      })(Element);

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(({ initialState }) => {
          expect(initialState.apollo.data).to.exist;
          expect(initialState.apollo.data['ROOT_QUERY.currentUser']).to.exist;
          done();
        });
    });
    it('shouldn\'t run queries if ssr is turned to off', (done) => {
      const Element = ({ data }) => {
        return <div>{data.loading ? 'loading' : data.currentUser.firstName}</div>;
      };

      const query = gql`
        query App {
          currentUser {
            firstName
          }
        }
      `;

      const data = {
        currentUser: {
          firstName: 'James',
        },
      };

      const networkInterface = mockNetworkInterface(
        {
          request: { query },
          result: { data },
          delay: 50,
        }
      );

      const apolloClient = new ApolloClient({
        networkInterface,
      });

      const WrappedElement = connect({
        mapQueriesToProps: () => ({
          data: { query, ssr: false },
        }),
      })(Element);

      const app = (
        <ApolloProvider client={apolloClient}>
          <WrappedElement />
        </ApolloProvider>
      );

      getDataFromTree(app)
        .then(({ initialState }) => {
          expect(initialState.apollo.data).to.exist;
          expect(initialState.apollo.data['ROOT_QUERY.currentUser']).to.not.exist;
          done();
        });
    });
  });
  describe('`renderToStringWithData`', () => {

    // XXX break into smaller tests
    // XXX mock all queries
    it('should work on a non trivial example', function(done) {
      this.timeout(10000);
      const networkInterface = createNetworkInterface('http://graphql-swapi.parseapp.com/');
      const apolloClient = new ApolloClient({
        networkInterface,
        // shouldBatch: true,
      });

      class Film extends React.Component<any, any> {
        render() {
          const { data } = this.props;
          if (data.loading) return null;
          const { film } = data;
          return <h6>{film.title}</h6>;
        }
      };

      const FilmWithData = connect({
        mapQueriesToProps: ({ ownProps }) => ({
          data: {
            query: gql`
              query GetFilm($id: ID!) {
                film: node(id: $id) {
                  ... on Film {
                    title
                  }
                }
              }
            `,
            variables: { id: ownProps.id },
          },
        }),
      })(Film);

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
                    <FilmWithData id={film.id} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }
      };

      const StarshipWithData = connect({
        mapQueriesToProps: ({ ownProps }) => ({
          data: {
            query: gql`
              query GetShip($id: ID!) {
                ship: node(id: $id) {
                  ... on Starship {
                    name
                    filmConnection {
                      films {
                        id
                      }
                    }
                  }
                }
              }
            `,
            variables: { id: ownProps.id },
          },
        }),
      })(Starship);

      class Element extends React.Component<any, any> {
        render() {
          const { data } = this.props;
          return (
            <ul>
              {!data.loading && data.allStarships && data.allStarships.starships.map((ship, key) => (
                <li key={key}>
                  <StarshipWithData id={ship.id} />
                </li>
              ))}
            </ul>
          );
        }
      }

      const AllShipsWithData = connect({
        mapQueriesToProps: () => ({
          data: {
            query: gql`
              query GetShips {
                allStarships(first: 2) {
                  starships {
                    id
                  }
                }
              }
            `,
          },
        }),
      })(Element);

      class Planet extends React.Component<any, any> {
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
      const AllPlanetsWithData = connect({
        mapQueriesToProps: () => ({
          data: {
            query: gql`
              query GetPlanets {
                allPlanets(first: 1) {
                  planets{
                    name
                  }
                }
              }
            `,
          },
        }),
      })(Planet);

      const Foo = () => (
        <div>
          <h1>Foo</h1>
          <Bar />
        </div>
      );

      class Bar extends React.Component<any, any> {
        render() {
          return (
            <div>
              <h2>Bar</h2>
              <AllPlanetsWithData />
            </div>
          );
        }
      }

      const app = (
        <ApolloProvider client={apolloClient}>
          <div>
            <AllShipsWithData />
            <hr />
            <Foo />
          </div>
        </ApolloProvider>
      );

      renderToStringWithData(app)
        .then(markup => {
          expect(markup).to.match(/CR90 corvette/);
          expect(markup).to.match(/Return of the Jedi/);
          expect(markup).to.match(/Return of the Jedi/);
          expect(markup).to.match(/Planets/);
          expect(markup).to.match(/Tatooine/);
          expect(markup).to.match(/__APOLLO_STATE__/);
          done();
        })
        .catch(done);
    });
  });
});
