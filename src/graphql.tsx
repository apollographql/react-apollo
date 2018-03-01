// pacify typescript (we have to turn off no unused locals though :cry:)
import * as React from 'react';
import { DocumentNode } from 'graphql';
import { parser, DocumentType } from './parser';
import { OperationOption, DataProps, MutateProps } from './types';

import { query } from './query-hoc';
import { mutation } from './mutation-hoc';
import { subscribe } from './subscription-hoc';

export function graphql<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = Partial<DataProps<TData, TGraphQLVariables>> &
    Partial<MutateProps<TData, TGraphQLVariables>>
>(
  document: DocumentNode,
  operationOptions: OperationOption<TProps, TData, TGraphQLVariables, TChildProps> = {},
) {
  switch (parser(document).type) {
    case DocumentType.Mutation:
      return mutation(document, operationOptions);
    case DocumentType.Subscription:
      return subscribe(document, operationOptions);
    // case DocumentType.Fragment:
    //   throw new Error('fragments cannont currently be used on their own');
    case DocumentType.Query:
    default:
      // the last argument being true is to keep full backwards compat of an old action for console
      // logging errors when they were unhandled. Usage of `query` or `<Query />`
      // shouldn't have this easily turned on
      return query(document, operationOptions, true);
  }
}
