/*

  This file is used to validate the flow typings for react-apollo.
  Currently it just serves as a smoke test around used imports and
  common usage patterns.

  Ideally this should include tests for all of the functionality of
  react-apollo

*/

// @flow
import { graphql } from "react-apollo";
import type { OperationComponent } from "react-apollo";
import type { DocumentNode } from "graphql";
import gql from "graphql-tag";

const query: DocumentNode = gql`{ foo }`;
const mutation: DocumentNode = gql`mutation { foo }`;

type IQuery = {
  foo: string,
};

// common errors

const withData: OperationComponent<IQuery> = graphql(query);

const ComponentWithData = withData(({ data: { foo }}) => {
  // $ExpectError
  if (foo > 1) return <span />;

  return null;
});
