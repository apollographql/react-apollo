/*

  This file is used to validate the flow typings for react-apollo.
  Currently it just serves as a smoke test around used imports and
  common usage patterns.

  Ideally this should include tests for all of the functionality of
  react-apollo

*/

// @flow
import gql from 'graphql-tag';
import * as React from 'react';
import { withApollo, graphql } from '../src';
import type { OperationComponent, GraphqlQueryControls, ChildProps, GraphqlData } from '../src';

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
  bar: string,
};

const withData: OperationComponent<IQuery> = graphql(query);

// Test a functional component
const FunctionalWithData = withData(({ data }) => {
  // $ExpectError string type being treated as numerical
  if (data.foo > 1) return <span />;

  return null;
});

// Test class component, this requieres a stricter definition
type BasicComponentProps = ChildProps<{}, IQuery>;
class BasicComponent extends React.Component<BasicComponentProps> {
  render() {
    const { foo, bar } = this.props.data;

    // $ExpectError string type beeing treated as numerical
    if (bar > 1) return null;

    // The below works as expected
    return <div>{foo.length} string length</div>;
  }
}
const BasicClassWithData = withData(BasicComponent);

// A class component with it's own variable
type CmplxOwnProps = {| faz: string |};
type CmplxComponentProps = {
  data: GraphqlQueryControls & IQuery,
  mutate: any, // The mutation is actually required or we get a error at the withData
} & CmplxOwnProps;
class CmplxComponent extends React.Component<CmplxComponentProps> {
  render() {
    const { data: { loading, error, bar, foo }, faz } = this.props;
    if (loading) return <div>Loading</div>;
    if (error) return <h1>ERROR</h1>;

    // $ExpectError string type beeing treated as numerical
    if (bar > 1) return null;

    // The below works as expected
    return (
      <div>
        {foo.length} string length compared to faz {faz.length} length
      </div>
    );
  }
}
const withFancyData: OperationComponent<IQuery, CmplxOwnProps> = graphql(query);
const CmplxWithData = withFancyData(CmplxComponent);

// Same as above but with the Props specified at the end
// since we don't rely on the ChildProps<P, R> we don't need the mutate: any
type Cmplx2OwnProps = { faz: string }; // We can have exact own props as we don't rely on the TMergedProps
type Cmplx2ComponentProps = {
  data: IQuery & GraphqlQueryControls,
} & Cmplx2OwnProps;
class Cmplx2Component extends React.Component<Cmplx2ComponentProps> {
  render() {
    const { data: { loading, error, bar, foo }, faz } = this.props;
    if (loading) return <div>Loading</div>;
    if (error) return <h1>ERROR</h1>;

    // $ExpectError string type beeing treated as numerical
    if (bar > 1) return null;

    // The below works as expected
    return (
      <div>
        {foo.length} string length compared to faz {faz.length} length
      </div>
    );
  }
}
const withFancyData2: OperationComponent<IQuery, Cmplx2OwnProps, Cmplx2ComponentProps> = graphql(
  query,
);
const Cmplx2WithData = withFancyData2(Cmplx2Component);

const HERO_QUERY = gql`
  query GetCharacter($episode: String!) {
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

export type InputProps = {
  episode: string,
};

type Variables = {
  episode: string,
};

type Props = GraphqlData<Response, Variables> & {
  someProp: string,
};

const withCharacter: OperationComponent<Response, InputProps, Props, Variables> = graphql(
  HERO_QUERY,
  {
    options: ({ episode }) => {
      // $ExpectError [string] The operand of an arithmetic operation must be a number
      episode * 10;
      return {
        // $ExpectError [number] This type is incompatible with string
        variables: { episode: 10 },
      };
    },
    props: ({ data, ownProps }) => ({
      ...data,
      // $ExpectError [string] This type cannot be compared to number
      episode: ownProps.episode > 1,
      // $ExpectError property `isHero`. Property not found on object type
      isHero: data && data.hero && data.hero.isHero,
      // $ExpectError Property `someProp`. This type is incompatible with string
      someProp: 1,
    }),
  },
);

export default withCharacter(({ loading, hero, error }) => {
  if (loading) return <div>Loading</div>;
  if (error) return <h1>ERROR</h1>;
  return null;
});

export class Character extends React.Component<Props> {
  render() {
    const { loading, hero, error } = this.props;
    if (loading) return <div>Loading</div>;
    if (error) return <h1>ERROR</h1>;
    return null; // actual component with data;
  }
}

const CharacterWithData = withCharacter(Character);

const Manual = withApollo(({ client }) => {
  // XXX please don't ever actually do this
  client.query({ query: HERO_QUERY });
  return null;
});

// withApollo passes `client` property so that it is no longer required
(Manual: React.ComponentType<{}>);
