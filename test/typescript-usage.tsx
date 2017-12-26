// this file tests compilation of typescript types to ensure compatibility
// we intentionally don't enforce TS compilation on the reset of the tests so we can
// test things like improper argument calling / etc to cause errors and ensure
// that the are handled
import * as React from 'react';
import gql from 'graphql-tag';
import { graphql } from '../src';
import { ChildProps, NamedProps, GraphqlQueryControls } from '../src';

const historyQuery = gql`
  query history($solutionId: String) {
    history(solutionId: $solutionId) {
      solutionId
      delta
    }
  }
`;

// const historyMutation = gql`
//   mutation updateHistory($input: updateHistoryMutation) {
//     updateHistory(input: $input) {
//       solutionId
//       delta
//     }
//   }
// `;

interface Data {
  history: [
    {
      solutionId: string;
      delta: number;
    }
  ];
}

// interface Mutation {
//   updateHistory?: MutationFunc<MutationPayload, MutationInput>;
// }
//
// interface MutationPayload {
//   updateHistory: Record<any, any>[];
// }
//
// interface MutationInput {
//   input: {
//     id: string;
//     newDelta: string;
//   };
// }

interface Props {
  solutionId: string;
}

// --------------------------
// standard wrapping
const withHistory = graphql<Props, Data>(historyQuery, {
  options: ownProps => ({
    variables: {
      solutionId: ownProps.solutionId,
    },
  }),
});

class HistoryView extends React.Component<ChildProps<Props, Data>> {
  render() {
    if (this.props.data.history.length > 0) {
      return <div>yay type checking works</div>;
    } else {
      return null;
    }
  }
}

const HistoryViewWithData = withHistory(HistoryView);
<HistoryViewWithData solutionId="foo" />; // tslint:disable-line

// --------------------------
// stateless function with data
const HistoryViewSFC = graphql<Props, Data>(historyQuery, {
  options: ownProps => ({
    variables: {
      solutionId: ownProps.solutionId,
    },
  }),
})(props => {
  if (this.props.data.history.length > 0) {
    return <div>yay type checking works</div>;
  } else {
    return null;
  }
});

<HistoryViewSFC solutionId="foo" />; // tslint:disable-line

// --------------------------
// decorator
@graphql<Props, Data>(historyQuery)
class DecoratedHistoryView extends React.Component<ChildProps<Props, Data>> {
  render() {
    if (this.props.data.history.length > 0) {
      return <div>yay type checking works</div>;
    } else {
      return null;
    }
  }
}
<DecoratedHistoryView solutionId="foo" />; // tslint:disable-line

// --------------------------
// with using name
const withHistoryUsingName = graphql<Props, Data>(historyQuery, {
  name: 'organisationData',
  props: ({
    organisationData,
  }: NamedProps<{ organisationData: GraphqlQueryControls & Data }, Props>) => ({
    ...organisationData,
  }),
});

const HistoryViewUsingName = withHistoryUsingName(HistoryView);
<HistoryViewUsingName solutionId="foo" />; // tslint:disable-line

// --------------------------
// mutation with name
// class UpdateHistoryView extends React.Component<
//   ChildProps<Props & Mutation, MutationPayload>,
//   {}
// > {
//   updateHistory() {
//     this.props.updateHistory({
//       variables: {
//         input: {
//           id: 'historyId',
//           newDelta: 'newDelta',
//         },
//       },
//     });
//   }
//
//   render() {
//     return null;
//   }
// }
