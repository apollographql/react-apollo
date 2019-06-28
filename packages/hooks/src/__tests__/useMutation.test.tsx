import React, { useEffect } from 'react';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { MockedProvider } from '@apollo/react-testing';
import { render, cleanup } from '@testing-library/react';
import { useMutation } from '@apollo/react-hooks';

describe('useMutation Hook', () => {
  afterEach(cleanup);

  it('should handle a simple mutation properly', done => {
    const mutation: DocumentNode = gql`
      mutation createTodo($description: String!) {
        createTodo(description: $description) {
          id
          description
          priority
        }
      }
    `;

    const variables = {
      description: 'Get milk!'
    };

    const resultData = {
      createTodo: {
        id: 1,
        description: 'Get milk!',
        priority: 'High',
        __typename: 'Todo'
      }
    };

    const mocks = [
      {
        request: {
          query: mutation,
          variables
        },
        result: { data: resultData }
      }
    ];

    let renderCount = 0;
    const Component = () => {
      const [{ loading, data }, createTodo] = useMutation(mutation);
      switch (renderCount) {
        case 0:
          expect(loading).toBeFalsy();
          expect(data).toBeUndefined();
          createTodo({ variables });
          break;
        case 1:
          expect(loading).toBeTruthy();
          expect(data).toBeUndefined();
          break;
        case 2:
          expect(loading).toBeFalsy();
          expect(data).toEqual(resultData);
          done();
          break;
        default:
      }
      renderCount += 1;
      return null;
    };

    render(
      <MockedProvider mocks={mocks}>
        <Component />
      </MockedProvider>
    );
  });

  it('should be able to call mutations as an effect', done => {
    const mutation: DocumentNode = gql`
      mutation createTodo($description: String!) {
        createTodo(description: $description) {
          id
          description
          priority
        }
      }
    `;

    const variables = {
      description: 'Get milk!'
    };

    const resultData = {
      createTodo: {
        id: 1,
        description: 'Get milk!',
        priority: 'High',
        __typename: 'Todo'
      }
    };

    const mocks = [
      {
        request: {
          query: mutation,
          variables
        },
        result: { data: resultData }
      }
    ];

    let renderCount = 0;
    const useCreateTodo = () => {
      const [{ loading, data }, createTodo] = useMutation(mutation);

      useEffect(() => {
        createTodo({ variables });
      }, [variables]);

      switch (renderCount) {
        case 0:
          expect(loading).toBeFalsy();
          expect(data).toBeUndefined();
          break;
        case 1:
          expect(loading).toBeTruthy();
          expect(data).toBeUndefined();
          break;
        case 2:
          expect(loading).toBeFalsy();
          expect(data).toEqual(resultData);
          done();
          break;
        default:
      }
      renderCount += 1;
      return null;
    };

    const Component = () => {
      useCreateTodo();
      return null;
    };

    render(
      <MockedProvider mocks={mocks}>
        <Component />
      </MockedProvider>
    );
  });
});
