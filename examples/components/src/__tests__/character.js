import React from 'react';
import { render } from '@testing-library/react';

import Character from '../Character';

import {
  empty,
  hero_no_friends,
  empty_array_friends,
  friend_without_appearsIn
} from '../__mocks__/data';

describe('Character', () => {
  it('returns markup for null response', () => {
    const { container } = render(<Character hero={empty} />);
    expect(container).toMatchSnapshot();
  });
  it('returns markup for a hero with no friends', () => {
    const { container } = render(<Character hero={hero_no_friends} />);
    expect(container).toMatchSnapshot();
  });
  it('returns markup for empty array of friends', () => {
    const { container } = render(<Character hero={empty_array_friends} />);
    expect(container).toMatchSnapshot();
  });
  it('returns markup for a friend without an appearsIn', () => {
    const { container } = render(<Character hero={friend_without_appearsIn} />);
    expect(container).toMatchSnapshot();
  });
});
