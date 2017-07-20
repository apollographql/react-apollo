/*

  This file is used to validate the flow typings for react-apollo.
  Currently it just serves as a smoke test around used imports and
  common usage patterns.

  Ideally this should include tests for all of the functionality of
  react-apollo

*/

// @flow
import { graphql } from "../src";
import type { OperationComponent, QueryProps } from "../src";
import gql from "graphql-tag";

const query = gql`
  {
    foo
  }
`;
const mutation = gql`
  mutation {
    foo
  }
`;

type IQuery = {
  foo: string,
};

// common errors

const withData: OperationComponent<IQuery> = graphql(query);

const ComponentWithData = withData(({ data: { foo } }) => {
  // $ExpectError
  if (foo > 1) return <span />;

  return null;
});

const HERO_QUERY = gql`
  query GetCharacter($episode: Episode!) {
    hero(episode: $episode) {
      name
      id
      friends {
        name
        id
        appearsIn
      }
    }
  }
`;

type Hero = {
  name: string,
  id: string,
  appearsIn: string[],
  friends: Hero[],
};

type Response = {
  hero: Hero,
};

type Props = Response & QueryProps;

export type InputProps = {
  episode: string,
};

const withCharacter: OperationComponent<
  Response,
  InputProps,
  Props
> = graphql(HERO_QUERY, {
  options: ({ episode }) => ({
    // $ExpectError [string] This type cannot be compared to number
    variables: { episode: episode > 1 },
  }),
  props: ({ data, ownProps }) => ({
    ...data,
    // $ExpectError [string] This type cannot be compared to number
    episode: ownProps.episode > 1,
    // $ExpectError property `isHero`. Property not found on object type
    isHero: data && data.hero && data.hero.isHero,
  }),
});

export default withCharacter(({ loading, hero, error }) => {
  if (loading) return <div>Loading</div>;
  if (error) return <h1>ERROR</h1>;
  return null;
});
