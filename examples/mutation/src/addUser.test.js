import React from 'react';
import { render, fireEvent, wait } from '@testing-library/react';
import { MockedProvider } from '@apollo/react-testing';

import AddUser, { ADD_USER } from './AddUser';

const request = {
  query: ADD_USER,
  variables: { username: 'peter' }
};

const mocks = [
  {
    request,
    result: {
      data: {
        createUser: {
          id: '1',
          username: 'peter',
          __typename: 'User'
        }
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

const waitUntilLoadingIsFinished = queryByText =>
  wait(() => {
    expect(queryByText('LOADING')).toBe(null);
  });

it('renders content if the mutation has not been called', () => {
  const { container } = render(
    <MockedProvider mocks={mocks}>
      <AddUser />
    </MockedProvider>
  );
  expect(container.firstChild).toMatchSnapshot();
});

it('fires the mutation', async () => {
  const {
    container,
    getByPlaceholderText,
    getByTestId,
    getByText,
    queryByText,
    debug
  } = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AddUser />
    </MockedProvider>
  );

  const inputNode = getByPlaceholderText('Username');
  inputNode.defaultValue = 'peter';
  fireEvent.change(inputNode);

  const buttonNode = getByTestId('add-user-button');
  fireEvent.click(buttonNode);

  getByText('LOADING');

  await waitUntilLoadingIsFinished(queryByText);

  getByText('Created peter with id 1');
});

it('errors', async () => {
  const { getByTestId, getByText, getByPlaceholderText, queryByText } = render(
    <MockedProvider mocks={mocksWithError} addTypename={false}>
      <AddUser />
    </MockedProvider>
  );

  const inputNode = getByPlaceholderText('Username');
  inputNode.value = 'peter';
  fireEvent.change(inputNode);

  const buttonNode = getByTestId('add-user-button');
  fireEvent.click(buttonNode);

  await waitUntilLoadingIsFinished(queryByText);

  getByText('ERROR');
});
