import * as React from 'react';
import ApolloClient from 'apollo-client';
import { ApolloLink, Observable } from 'apollo-link';
import {
  print,
  graphql as execute,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLID,
  DocumentNode,
} from 'graphql';
import { graphql, ApolloProvider, renderToStringWithData, ChildProps, Query } from '../../src';
import gql from 'graphql-tag';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';

const planetMap = new Map([['Planet:1', { id: 'Planet:1', name: 'Tatooine' }]]);

const shipMap = new Map([
  [
    'Ship:2',
    {
      id: 'Ship:2',
      name: 'CR90 corvette',
      films: ['Film:4', 'Film:6', 'Film:3'],
    },
  ],
  [
    'Ship:3',
    {
      id: 'Ship:3',
      name: 'Star Destroyer',
      films: ['Film:4', 'Film:5', 'Film:6'],
    },
  ],
]);

const filmMap = new Map([
  ['Film:3', { id: 'Film:3', title: 'Revenge of the Sith' }],
  ['Film:4', { id: 'Film:4', title: 'A New Hope' }],
  ['Film:5', { id: 'Film:5', title: 'the Empire Strikes Back' }],
  ['Film:6', { id: 'Film:6', title: 'Return of the Jedi' }],
]);

const PlanetType = new GraphQLObjectType({
  name: 'Planet',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const FilmType = new GraphQLObjectType({
  name: 'Film',
  fields: {
    id: { type: GraphQLID },
    title: { type: GraphQLString },
  },
});

const ShipType = new GraphQLObjectType({
  name: 'Ship',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    films: {
      type: new GraphQLList(FilmType),
      resolve: ({ films }) => films.map((id: string) => filmMap.get(id)),
    },
  },
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    allPlanets: {
      type: new GraphQLList(PlanetType),
      resolve: () => Array.from(planetMap.values()),
    },
    allShips: {
      type: new GraphQLList(ShipType),
      resolve: () => Array.from(shipMap.values()),
    },
    ship: {
      type: ShipType,
      args: { id: { type: GraphQLID } },
      resolve: (_, { id }) => shipMap.get(id),
    },
    film: {
      type: FilmType,
      args: { id: { type: GraphQLID } },
      resolve: (_, { id }) => filmMap.get(id),
    },
  },
});

const Schema = new GraphQLSchema({ query: QueryType });

describe('SSR', () => {
  describe('`renderToStringWithData`', () => {
    // XXX break into smaller tests
    // XXX mock all queries
    it('should work on a non trivial example', function() {
      const apolloClient = new ApolloClient({
        link: new ApolloLink(config => {
          return new Observable(observer => {
            execute(Schema, print(config.query), null, null, config.variables, config.operationName)
              .then(result => {
                observer.next(result);
                observer.complete();
              })
              .catch(e => {
                observer.error(e);
              });
          });
        }),
        cache: new Cache(),
      });

      @graphql(gql`
        query data($id: ID!) {
          film(id: $id) {
            title
          }
        }
      ` as DocumentNode)
      class Film extends React.Component<any, any> {
        render(): React.ReactNode {
          const { data } = this.props;
          if (data.loading) return null;
          const { film } = data;
          return <h6>{film.title}</h6>;
        }
      }

      interface ShipData {
        ship: {
          name: string;
          films: { id: string }[];
        };
      }

      interface ShipVariables {
        id: string;
      }

      @graphql<ShipVariables, ShipData, ShipVariables>(gql`
        query data($id: ID!) {
          ship(id: $id) {
            name
            films {
              id
            }
          }
        }
      ` as DocumentNode)
      class Starship extends React.Component<ChildProps<ShipVariables, ShipData, ShipVariables>> {
        render(): React.ReactNode {
          const { data } = this.props;
          if (!data || data.loading || !data.ship) return null;
          const { ship } = data;
          return (
            <div>
              <h4>{ship.name} appeared in the following films:</h4>
              <br />
              <ul>
                {ship.films.map((film, key) => (
                  <li key={key}>
                    <Film id={film.id} />
                  </li>
                ))}
              </ul>
            </div>
          );
        }
      }

      interface AllShipsData {
        allShips: { id: string }[];
      }

      @graphql<{}, AllShipsData>(gql`
        query data {
          allShips {
            id
          }
        }
      ` as DocumentNode)
      class AllShips extends React.Component<ChildProps<{}, AllShipsData>> {
        render(): React.ReactNode {
          const { data } = this.props;
          return (
            <ul>
              {data &&
                !data.loading &&
                data.allShips &&
                data.allShips.map((ship, key) => (
                  <li key={key}>
                    <Starship id={ship.id} />
                  </li>
                ))}
            </ul>
          );
        }
      }

      interface AllPlanetsData {
        allPlanets: { name: string }[];
      }

      @graphql<{}, AllPlanetsData>(gql`
        query data {
          allPlanets {
            name
          }
        }
      ` as DocumentNode)
      class AllPlanets extends React.Component<ChildProps<{}, AllPlanetsData>> {
        render(): React.ReactNode {
          const { data } = this.props;
          if (!data || data.loading) return null;
          return (
            <div>
              <h1>Planets</h1>
              {(data.allPlanets || []).map((planet, key) => (
                <div key={key}>{planet.name}</div>
              ))}
            </div>
          );
        }
      }

      const Bar = () => (
        <div>
          <h2>Bar</h2>
          <AllPlanets />
        </div>
      );
      const Foo = () => (
        <div>
          <h1>Foo</h1>
          <Bar />
        </div>
      );

      const app = (
        <ApolloProvider client={apolloClient}>
          <div>
            <Foo />
            <hr />
            <AllShips />
          </div>
        </ApolloProvider>
      );

      return renderToStringWithData(app).then(markup => {
        expect(markup).toMatch(/CR90 corvette/);
        expect(markup).toMatch(/Return of the Jedi/);
        expect(markup).toMatch(/A New Hope/);
        expect(markup).toMatch(/Planets/);
        expect(markup).toMatch(/Tatooine/);
      });
    });
  });

  it('should work with React.createContext', async () => {
    // Preact doesn't support createContext so this test won't run in Preact
    if (React.createContext) {
      let defaultValue = 'default';
      let Context = React.createContext(defaultValue);
      let providerValue = 'provider';
      expect(
        await renderToStringWithData(
          <React.Fragment>
            <Context.Provider value={providerValue} />
            <Context.Consumer>
              {val => {
                expect(val).toBe(defaultValue);
                return val;
              }}
            </Context.Consumer>
          </React.Fragment>,
        ),
      ).toBe(defaultValue);
      expect(
        await renderToStringWithData(
          <Context.Provider value={providerValue}>
            <Context.Consumer>
              {val => {
                expect(val).toBe(providerValue);
                return val;
              }}
            </Context.Consumer>
          </Context.Provider>,
        ),
      ).toBe(providerValue);
      expect(
        await renderToStringWithData(
          <Context.Consumer>
            {val => {
              expect(val).toBe(defaultValue);
              return val;
            }}
          </Context.Consumer>,
        ),
      ).toBe(defaultValue);
      let ContextForUndefined = React.createContext<void | string>(defaultValue);

      expect(
        await renderToStringWithData(
          <ContextForUndefined.Provider value={undefined}>
            <ContextForUndefined.Consumer>
              {val => {
                expect(val).toBeUndefined();
                return val === undefined ? 'works' : 'broken';
              }}
            </ContextForUndefined.Consumer>
          </ContextForUndefined.Provider>,
        ),
      ).toBe('works');

      const apolloClient = new ApolloClient({
        link: new ApolloLink(config => {
          return new Observable(observer => {
            execute(Schema, print(config.query), null, null, config.variables, config.operationName)
              .then(result => {
                observer.next(result);
                observer.complete();
              })
              .catch(e => {
                observer.error(e);
              });
          });
        }),
        cache: new Cache(),
      });

      expect(
        await renderToStringWithData(
          <ApolloProvider client={apolloClient}>
            <Context.Provider value={providerValue}>
              <Query
                query={gql`
                  query ShipIds {
                    allShips {
                      id
                    }
                  }
                `}
              >
                {() => (
                  <Context.Consumer>
                    {val => {
                      expect(val).toBe(providerValue);
                      return val;
                    }}
                  </Context.Consumer>
                )}
              </Query>
            </Context.Provider>
          </ApolloProvider>,
        ),
      ).toBe(providerValue);
    }
  });
});
