
import { OperationDefinition } from 'graphql';

import { expect } from 'chai';
import gql from 'graphql-tag';

import { parser, DocumentType } from '../src/parser';

describe('parser', () => {

  // XXX can this be tested with strictly typed functions?
  // it('should error on an invalid document', () => {
  //   expect(parser('{ user { name } }')).to.throw();
  // });

  it('should error if fragments are included in the operation', () => {
    const query = gql`fragment bookInfo on Book { name }`;

    try { parser(query); } catch (e) {
      expect(e).to.match(/Invariant Violation: Fragments/);
    }
  });

  it('should error if both a query and a mutation is present', () => {
    const query = gql`
      query { user { name } }
      mutation ($t: String) { addT(t: $t) { user { name } } }
    `;

    try { parser(query); } catch (e) {
      expect(e).to.match(/Invariant Violation/);
    }
  });

  it('should error if multiple operations are present', () => {
    const query = gql`
      query One { user { name } }
      query Two { user { name } }
    `;

    try { parser(query); } catch (e) {
      expect(e).to.match(/Invariant Violation/);
    }
  });

  it('should return the name of the operation', () => {
    const query = gql`query One { user { name } }`;
    expect(parser(query).name).to.eq('One');

    const mutation = gql`mutation One { user { name } }`;
    expect(parser(mutation).name).to.eq('One');
  });

  it('should return data as the name of the operation if not named', () => {
    const query = gql`query { user { name } }`;
    expect(parser(query).name).to.eq('data');

    const unnamedQuery = gql`{ user { name } }`;
    expect(parser(unnamedQuery).name).to.eq('data');

    const mutation = gql`mutation { user { name } }`;
    expect(parser(mutation).name).to.eq('data');
  });

  it('should return the type of operation', () => {
    const query = gql`query One { user { name } }`;
    expect(parser(query).type).to.eq(DocumentType.Query);

    const unnamedQuery = gql`{ user { name } }`;
    expect(parser(unnamedQuery).type).to.eq(DocumentType.Query);

    const mutation = gql`mutation One { user { name } }`;
    expect(parser(mutation).type).to.eq(DocumentType.Mutation);
  });

  it('should return the variable definitions of the operation', () => {

    const query = gql`query One($t: String!) { user(t: $t) { name } }`;
    let definition = query.definitions[0] as OperationDefinition;
    expect(parser(query).variables).to.deep.equal(definition.variableDefinitions);

    const mutation = gql`mutation One($t: String!) { user(t: $t) { name } }`;
    definition = mutation.definitions[0] as OperationDefinition;
    expect(parser(mutation).variables).to.deep.equal(definition.variableDefinitions);
  });

  it('should not error if the operation has no variables', () => {
    const query = gql`query { user(t: $t) { name } }`;
    let definition = query.definitions[0] as OperationDefinition;
    expect(parser(query).variables).to.deep.equal(definition.variableDefinitions);

    const mutation = gql`mutation { user(t: $t) { name } }`;
    definition = mutation.definitions[0] as OperationDefinition;
    expect(parser(mutation).variables).to.deep.equal(definition.variableDefinitions);
  });


});
