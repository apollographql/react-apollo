import {
  DocumentNode,
  DefinitionNode,
  VariableDefinitionNode,
  OperationDefinitionNode,
} from 'graphql';

import { invariant } from 'ts-invariant';

export enum DocumentType {
  Query,
  Mutation,
  Subscription,
}

export interface IDocumentDefinition {
  type: DocumentType;
  name: string;
  variables: ReadonlyArray<VariableDefinitionNode>;
}

const cache = new Map();

// the parser is mainly a safety check for the HOC
export function parser(document: DocumentNode): IDocumentDefinition {
  const cached = cache.get(document);
  if (cached) return cached;
  // variables
  let variables, type, name;

  /*

    Saftey checks for proper usage of react-apollo

  */
  invariant(
    !!document && !!document.kind,
    // tslint:disable-line
    `Argument of ${document} passed to parser was not a valid GraphQL ` +
      `DocumentNode. You may need to use 'graphql-tag' or another method ` +
      `to convert your operation into a document`,
  );

  const fragments = document.definitions.filter(
    (x: DefinitionNode) => x.kind === 'FragmentDefinition',
  );

  const queries = document.definitions.filter(
    (x: DefinitionNode) => x.kind === 'OperationDefinition' && x.operation === 'query',
  );

  const mutations = document.definitions.filter(
    (x: DefinitionNode) => x.kind === 'OperationDefinition' && x.operation === 'mutation',
  );

  const subscriptions = document.definitions.filter(
    (x: DefinitionNode) => x.kind === 'OperationDefinition' && x.operation === 'subscription',
  );

  invariant(
    !fragments.length || (queries.length || mutations.length || subscriptions.length),
    `Passing only a fragment to 'graphql' is not yet supported. ` +
      `You must include a query, subscription or mutation as well`,
  );

  invariant(
    queries.length + mutations.length + subscriptions.length <= 1,
    // tslint:disable-line
    `react-apollo only supports a query, subscription, or a mutation per HOC. ` +
      `${document} had ${queries.length} queries, ${subscriptions.length} ` +
      `subscriptions and ${mutations.length} mutations. ` +
      `You can use 'compose' to join multiple operation types to a component`,
  );

  type = queries.length ? DocumentType.Query : DocumentType.Mutation;
  if (!queries.length && !mutations.length) type = DocumentType.Subscription;

  const definitions = queries.length ? queries : mutations.length ? mutations : subscriptions;

  invariant(
    definitions.length === 1,
    // tslint:disable-line
    `react-apollo only supports one definition per HOC. ${document} had ` +
      `${definitions.length} definitions. ` +
      `You can use 'compose' to join multiple operation types to a component`,
  );

  const definition = definitions[0] as OperationDefinitionNode;
  variables = definition.variableDefinitions || [];

  if (definition.name && definition.name.kind === 'Name') {
    name = definition.name.value;
  } else {
    name = 'data'; // fallback to using data if no name
  }

  const payload = { name, type, variables };
  cache.set(document, payload);
  return payload;
}
