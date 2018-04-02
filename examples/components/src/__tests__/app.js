import React from 'react';
import renderer from 'react-test-renderer';

// @IMPORTANT this is normally consumed from react-apollo/test-utils
// but during development, it needs to be pulled from lib
import { MockedProvider } from 'react-apollo/lib/test-utils';

import { HERO_QUERY, App, HeroQuery, Character } from '../App';

import {
  empty,
  hero_no_friends,
  empty_array_friends,
  friend_without_appearsIn,
  full,
} from '../__mocks__/data';

const request = {
  query: HERO_QUERY,
  variables: { episode: 'EMPIRE' },
};

const mocks = [
  {
    request,
    result: {
      data: {
        hero: full,
      },
    },
  },
];

class ErrorBoundary extends React.Component {
  componentDidCatch(e) {
    console.log(e);
  }

  render() {
    return this.props.children;
  }
}

describe('App', () => {
  it('renders', () => {
    const tree = renderer.create(
      <MockedProvider mocks={mocks} removeTypename>
        <App />
      </MockedProvider>,
    );
    expect(tree).toMatchSnapshot();
  });
});

describe('Hero Query', () => {
  it('renders loading and data', done => {
    let renderCount = 0;

    renderer.create(
      <ErrorBoundary>
        <MockedProvider mocks={mocks} removeTypename>
          <HeroQuery episode="EMPIRE">
            {result => {
              if (renderCount === 0) {
                expect(result).toEqual({
                  loading: true,
                });
              } else if (renderCount === 1) {
                expect(result).toEqual({
                  loading: false,
                  hero: full,
                });
                done();
              }

              renderCount++;
              return null;
            }}
          </HeroQuery>
        </MockedProvider>
      </ErrorBoundary>,
    );
  });

  it('renders error', done => {
    const mocksWithError = [
      {
        request,
        error: new Error('Something went wrong'),
      },
    ];

    let renderCount = 0;

    renderer.create(
      <ErrorBoundary>
        <MockedProvider mocks={mocksWithError} removeTypename>
          <HeroQuery episode="EMPIRE">
            {result => {
              if (renderCount === 1) {
                expect(result).toEqual({
                  error: new Error('Network error: Something went wrong'),
                  loading: false,
                });
                done();
              }

              renderCount++;
              return null;
            }}
          </HeroQuery>
        </MockedProvider>
      </ErrorBoundary>,
    );
  });
});

describe('Character', () => {
  it('handles a loading state', () => {
    const output = renderer.create(<Character loading />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('handles an error state', () => {
    const output = renderer.create(<Character error />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for null response', () => {
    const output = renderer.create(<Character hero={empty} />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for a hero with no friends', () => {
    const output = renderer.create(<Character hero={hero_no_friends} />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for empty array of friends', () => {
    const output = renderer.create(<Character hero={empty_array_friends} />);
    expect(output.toJSON()).toMatchSnapshot();
  });
  it('returns markup for a friend without an appearsIn', () => {
    const output = renderer.create(<Character hero={friend_without_appearsIn} />);
    expect(output.toJSON()).toMatchSnapshot();
  });
});
