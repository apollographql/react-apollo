// __tests__/Intro-test.js
import 'react-native';
import React from 'react';
import App from '../component';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

describe('App', () => {

  it('renders correctly', () => {
    const tree = renderer.create(
      <App />
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

});
