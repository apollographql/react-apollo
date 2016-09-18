
import { OperationDefinition } from 'graphql';

import gql from 'graphql-tag';

import { parser, DocumentType } from '../src/parser';

describe('parser', () => {

  // XXX can this be tested with strictly typed functions?
  // it('should error on an invalid document', () => {
  //   expect(parser('{ user { name } }')).to.throw();
  // });

  it('should dynamically create `FragmentDefinition` for included fragments', () => {
    const query = gql`
      fragment bookInfo on Book { name }
      query getBook {
        books {
          ...bookInfo
        }
      }
    `;

    const parsed =  parser(query);
    expect(parsed.fragments.length).toBe(1);
  });

  it('should error if both a query and a mutation is present', () => {
    const query = gql`
      query { user { name } }
      mutation ($t: String) { addT(t: $t) { user { name } } }
    `;

    try { parser(query); } catch (e) {
      expect(e).toMatch(/Invariant Violation/);
    }
  });

  it('should error if multiple operations are present', () => {
    const query = gql`
      query One { user { name } }
      query Two { user { name } }
    `;

    try { parser(query); } catch (e) {
      expect(e).toMatch(/Invariant Violation/);
    }
  });

  it('should return the name of the operation', () => {
    const query = gql`query One { user { name } }`;
    expect(parser(query).name).toBe('One');

    const mutation = gql`mutation One { user { name } }`;
    expect(parser(mutation).name).toBe('One');
  });

  it('should return data as the name of the operation if not named', () => {
    const query = gql`query { user { name } }`;
    expect(parser(query).name).toBe('data');

    const unnamedQuery = gql`{ user { name } }`;
    expect(parser(unnamedQuery).name).toBe('data');

    const mutation = gql`mutation { user { name } }`;
    expect(parser(mutation).name).toBe('data');
  });

  it('should return the type of operation', () => {
    const query = gql`query One { user { name } }`;
    expect(parser(query).type).toBe(DocumentType.Query);

    const unnamedQuery = gql`{ user { name } }`;
    expect(parser(unnamedQuery).type).toBe(DocumentType.Query);

    const mutation = gql`mutation One { user { name } }`;
    expect(parser(mutation).type).toBe(DocumentType.Mutation);
  });

  it('should return the variable definitions of the operation', () => {

    const query = gql`query One($t: String!) { user(t: $t) { name } }`;
    let definition = query.definitions[0] as OperationDefinition;
    expect(parser(query).variables).toEqual(definition.variableDefinitions);

    const mutation = gql`mutation One($t: String!) { user(t: $t) { name } }`;
    definition = mutation.definitions[0] as OperationDefinition;
    expect(parser(mutation).variables).toEqual(definition.variableDefinitions);
  });

  it('should not error if the operation has no variables', () => {
    const query = gql`query { user(t: $t) { name } }`;
    let definition = query.definitions[0] as OperationDefinition;
    expect(parser(query).variables).toEqual(definition.variableDefinitions);

    const mutation = gql`mutation { user(t: $t) { name } }`;
    definition = mutation.definitions[0] as OperationDefinition;
    expect(parser(mutation).variables).toEqual(definition.variableDefinitions);
  });


});
