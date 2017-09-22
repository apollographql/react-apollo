// this file tests compliation of typescript types to ensure compatibility
// we intentionly don't enfore TS compliation on the reset of the tests so we can
// test things like improper arugment calling / etc to cause errors and ensure
// that the are handled
import * as React from 'react';
import gql from 'graphql-tag';

import { graphql } from '../src';
import { ChildProps, NamedProps, QueryProps, MutationFunc } from '../src';

const historyQuery = gql`
  query history($solutionId: String) {
    history(solutionId: $solutionId) {
      solutionId
      delta
    }
  }
`;

const historyMutation = gql`
  mutation updateHistory($input: updateHistoryMutation) {
    updateHistory(input: $input) {
      solutionId
      delta
    }
  }
`;

type Data = {
  history: Record<any, any>[];
};

type Mutation = {
  updateHistory?: MutationFunc<MutationPayload, MutationInput>;
};

type MutationPayload = {
  updateHistory: Record<any, any>[];
};

type MutationInput = {
  input: {
    id: string;
    newDelta: string;
  };
};

type Props = {
  solutionId: string;
};

// standard wrapping
const withHistory = graphql<Data, Props>(historyQuery, {
  options: ownProps => ({
    variables: {
      solutionId: ownProps.solutionId,
    },
  }),
});

class HistoryView extends React.Component<ChildProps<Props, Data>, {}> {}

const HistoryViewWithData = withHistory(HistoryView);

// decorator
@graphql<Data, Props>(historyQuery)
class DecoratedHistoryView extends React.Component<ChildProps<Props, Data>> {
  render() {
    return null;
  }
}

// with using name
const withHistoryUsingName = graphql<Data, Props>(historyQuery, {
  name: 'organisationData',
  props: ({
    organisationData,
  }: NamedProps<{ organisationData: QueryProps & Data }, Props>) => ({
    ...organisationData,
  }),
});

// mutation with name
class UpdateHistoryView extends React.Component<
  ChildProps<Props & Mutation, MutationPayload>,
  {}
> {
  updateHistory() {
    this.props.updateHistory({
      variables: {
        input: {
          id: 'historyId',
          newDelta: 'newDelta',
        },
      },
    });
  }

  render() {
    return null;
  }
}
