import React from 'react';
import { MockedProvider } from '@apollo/react-testing';
import { render, wait } from '@testing-library/react';

import App, { HERO_QUERY } from '../app';
import { full } from '../__mocks__/data';

const request = {
  query: HERO_QUERY,
  variables: { episode: 'EMPIRE' }
};

const mocks = [
  {
    request,
    result: {
      data: {
        hero: full
      }
    }
  }
];

const mocksWithError = [
  {
    request,
    error: new Error('Something went wrong')
  }
];

describe('App', () => {
  it('renders loading', () => {
    const { container } = render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App episode="EMPIRE" />
      </MockedProvider>
    );

    expect(container).toMatchSnapshot();
  });

  it('renders data', async () => {
    const { queryByText, container } = render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App episode="EMPIRE" />
      </MockedProvider>
    );

    await waitUntilLoadingIsFinished(queryByText);

    expect(container).toMatchSnapshot();
  });

  it('renders error', async () => {
    const { queryByText, container } = render(
      <MockedProvider mocks={mocksWithError} addTypename={false}>
        <App episode="EMPIRE" />
      </MockedProvider>
    );

    await waitUntilLoadingIsFinished(queryByText);

    expect(container).toMatchSnapshot();
  });
});

const waitUntilLoadingIsFinished = queryByText =>
  wait(() => {
    const isLoading = queryByText('Loading') != null;
    expect(isLoading).toBe(false);
  });
