import { parser, DocumentType } from './parser';
import { OperationOption, DataProps, MutateProps } from './types';

import { query } from './query-hoc';
import { mutation } from './mutation-hoc';

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
      break;
    case DocumentType.Subscription:
      console.log('subscription');
    case DocumentType.Fragment:
      throw new Error('fragments cannont currently be used on their own');
    case DocumentType.Query:
    default:
      return query(document, operationOptions);
      break;
  }
}
