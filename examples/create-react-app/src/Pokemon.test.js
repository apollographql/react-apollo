import React from 'react';
import renderer from 'react-test-renderer';
import { MockedProvider } from '../../../lib/test-utils';
import { print } from 'graphql';
import { addTypenameToDocument } from 'apollo-client/queries/queryTransform';

import PokemonWithData, { POKEMON_QUERY, Pokemon, withPokemon } from './Pokemon';

const mockedData = {
  pokemon: {
    __typename: 'Pokemon',
    name: 'Charmander',
    image: 'https://img.pokemondb.net/artwork/charmander.jpg',
  },
};

const query = addTypenameToDocument(POKEMON_QUERY);
const variables = { name: 'charmander' };

describe('default export', () => {
  it('renders without crashing', () => {
    const output = renderer.create(
      <MockedProvider mocks={[
        { request: { query, variables }, result: { data: mockedData } }
      ]}>
        <PokemonWithData />
      </MockedProvider>
    )
    expect(output.toJSON()).toMatchSnapshot();
  });
});

describe('Pokemon enhancer', () => {
  it('renders with loading first', (done) => {
    class Container extends React.Component {
      componentWillMount() {
        expect(this.props.data.loading).toBe(true);
        expect(this.props.data.pokemon).toBeFalsy();
        done();
      }
      render() {
        return null;
      }
    };
    const ContainerWithData = withPokemon(Container);
    const output = renderer.create(
      <MockedProvider mocks={[
        { request: { query, variables }, result: { data: mockedData } }]
      }>
        <ContainerWithData />
      </MockedProvider>
    );
  });

   it('renders data without crashing', (done) => {
    class Container extends React.Component {
      componentWillReceiveProps(props) {
        expect(props.data.loading).toBe(false);
        expect(props.data.pokemon).toEqual(mockedData.pokemon);
        done();
      }
      render() {
        return null;
      }
    };
    const ContainerWithData = withPokemon(Container);
    const output = renderer.create(
      <MockedProvider mocks={[
        { request: { query, variables }, result: { data: mockedData } }
      ]}>
        <ContainerWithData />
      </MockedProvider>
    );
  });

  it('renders with an error correctly', (done) => {
    try {
      class Container extends React.Component {
        componentWillReceiveProps(props) {
          expect(props.data.error).toBeTruthy();
          done();
        }
        render() {
          return null;
        }
      };
      const ContainerWithData = withPokemon(Container);
      const output = renderer.create(
        <MockedProvider mocks={[
          { request: { query, variables }, error: new Error('fail') }
        ]}>
          <ContainerWithData />
        </MockedProvider>
      );
    } catch (e) {
      console.log(e);
    }
  });
});

describe('Pokemon query', () => {
  // it('should match expected structure', () => {
  //   expect(POKEMON_QUERY).toMatchSnapshot();
  // });

  it('should match expected shape', () => {
    expect(print(POKEMON_QUERY)).toMatchSnapshot();
  });
});

describe('Pokemon Component', () => {
  it('should render a loading state without data', () => {
    const output = renderer.create(<Pokemon data={{ loading: true }} />)
    expect(output.toJSON()).toMatchSnapshot();
  });

  it('should render an error', () => {
    const output = renderer.create(<Pokemon data={{ error: new Error("ERROR") }} />)
    expect(output.toJSON()).toMatchSnapshot();
  });

  it('should render name and image in order', () => {
    const output = renderer.create(
      <Pokemon data={{ loading: false, content: mockedData.pokemon }} />
    );
    expect(output.toJSON()).toMatchSnapshot();
  });
});


