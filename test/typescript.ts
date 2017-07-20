// this file tests compliation of typescript types to ensure compatibility
// we intentionly don't enfore TS compliation on the reset of the tests so we can
// test things like improper arugment calling / etc to cause errors and ensure
// that the are handled
import * as React from 'react';
import gql from 'graphql-tag';

import { graphql } from '../src';
import { ChildProps, NamedProps, QueryProps } from '../src';

const historyQuery = gql`
  query history($solutionId: String) {
    history(solutionId: $solutionId) {
      solutionId
      delta
    }
  }
`;

type Data = {
  history: Record<any, any>[];
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
