import * as React from 'react';
import * as renderer from 'react-test-renderer';

// @IMPORTANT this is normally consumed from react-apollo/test-utils
// but during development, it needs to be pulled from lib
import { MockedProvider } from 'react-apollo/lib/test-utils';

import { addTypenameToDocument } from 'apollo-client';

import {
  HERO_QUERY,
  withCharacter,
  CharacterWithoutData,
  App,
  ShapedProps,
} from '../App';

const query = addTypenameToDocument(HERO_QUERY);

import {
  empty,
  hero_no_friends,
  empty_array_friends,
  friend_without_appearsIn,
  full,
} from '../__mocks__/data';

const variables = { episode: 'NEWHOPE' };

describe('withCharacter', () => {
  it('shapes the props into variables', done => {
    class Container extends React.Component<ShapedProps> {
      componentWillMount() {
        expect(this.props.variables).toEqual(variables);
        done();
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withCharacter(Container);
    const mocks = [
      { request: { query, variables }, result: { data: { hero: empty } } },
    ];
    renderer.create(
      <MockedProvider mocks={mocks}>
        <ContainerWithData {...variables} />
      </MockedProvider>,
    );
  });
  it('reshapes the data into the passed props', done => {
    class Container extends React.Component<ShapedProps> {
      componentWillReceiveProps(next: ShapedProps) {
        expect(next.hero).toEqual(hero_no_friends);
        done();
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withCharacter(Container);
    const mocks = [
      {
        request: { query, variables },
        result: { data: { hero: hero_no_friends } },
      },
    ];
    renderer.create(
      <MockedProvider mocks={mocks}>
        <ContainerWithData {...variables} />
      </MockedProvider>,
    );
  });
  it('has a loading state', done => {
    class Container extends React.Component<ShapedProps> {
      componentWillMount() {
        expect(this.props.loading).toBe(true);
      }
      componentWillReceiveProps(next: ShapedProps) {
        expect(next.loading).toBe(false);
        done();
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withCharacter(Container);
    const mocks = [
      {
        request: { query, variables },
        result: { data: { hero: hero_no_friends } },
      },
    ];
    renderer.create(
      <MockedProvider mocks={mocks}>
        <ContainerWithData {...variables} />
      </MockedProvider>,
    );
  });
  it('has a potential error state', done => {
    class Container extends React.Component<ShapedProps> {
      componentWillMount() {
        expect(this.props.loading).toBe(true);
      }
      componentWillReceiveProps(next: ShapedProps) {
        expect(next.loading).toBe(false);
        expect(next.error.message).toMatch(
          /these are not the droids you are looking for/,
        );
        done();
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withCharacter(Container);
    const mocks = [
      {
        request: { query, variables },
        error: new Error('these are not the droids you are looking for'),
      },
    ];

    renderer.create(
      <MockedProvider mocks={mocks}>
        <ContainerWithData {...variables} />
      </MockedProvider>,
    );
  });
});

describe('CharacterWithoutData', () => {
  it('handles a loading state', () => {
    const output = renderer.create(<CharacterWithoutData loading />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('handles an error state', () => {
    const output = renderer.create(<CharacterWithoutData error />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for null response', () => {
    const output = renderer.create(<CharacterWithoutData hero={empty} />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for a hero with no friends', () => {
    const output = renderer.create(
      <CharacterWithoutData hero={hero_no_friends} />,
    );
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for empty array of friends', () => {
    const output = renderer.create(
      <CharacterWithoutData hero={empty_array_friends} />,
    );
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for a friend without an appearsIn', () => {
    const output = renderer.create(
      <CharacterWithoutData hero={friend_without_appearsIn} />,
    );
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('renders a full data result', () => {
    const output = renderer.create(<CharacterWithoutData hero={full} />);
    expect(output.toJSON()).toMatchSnapshot();
  });
});

describe('App', () => {
  it('renders the data from NEWHOPE', () => {
    const mocks = [
      { request: { query, variables }, result: { data: { hero: empty } } },
    ];
    const output = renderer.create(
      <MockedProvider mocks={mocks}>
        <App />
      </MockedProvider>,
    );

    expect(output.toJSON()).toMatchSnapshot();
  });
});
