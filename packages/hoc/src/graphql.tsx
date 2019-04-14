import { DocumentNode } from 'graphql';
import { parser, DocumentType } from '@apollo/react-common';
import {
  OperationOption,
  DataProps,
  MutateProps,
} from '@apollo/react-components';

import { withQuery } from './query-hoc';
import { withMutation } from './mutation-hoc';
import { withSubscription } from './subscription-hoc';

export function graphql<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = Partial<DataProps<TData, TGraphQLVariables>> &
    Partial<MutateProps<TData, TGraphQLVariables>>
>(
  document: DocumentNode,
  operationOptions: OperationOption<
    TProps,
    TData,
    TGraphQLVariables,
    TChildProps
  > = {},
) {
  switch (parser(document).type) {
    case DocumentType.Mutation:
      return withMutation(document, operationOptions);
    case DocumentType.Subscription:
      return withSubscription(document, operationOptions);
    case DocumentType.Query:
    default:
      return withQuery(document, operationOptions);
  }
}
