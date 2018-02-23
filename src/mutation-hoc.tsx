import * as React from 'react';
const hoistNonReactStatics = require('hoist-non-react-statics');

const invariant = require('invariant');

import { parser, DocumentType } from './parser';
import {
  MutationOpts,
  OperationOption,
  QueryOpts,
  GraphqlQueryControls,
  MutationFunc,
  OptionProps,
  DataProps,
  MutateProps,
} from './types';
import { default as Mutation } from './Mutation';
import {
  defaultMapPropsToOptions,
  getDisplayName,
  calculateVariablesFromProps,
  GraphQLBase,
} from './hoc-utils';

export function mutation<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = Partial<MutateProps<TData, TGraphQLVariables>>
>(
  document: DocumentNode,
  operationOptions: OperationOption<TProps, TData, TGraphQLVariables, TChildProps> = {},
) {
  // this is memozied so if coming from `graphql` there is nearly no extra cost
  const operation = parser(document);
  // extract options

  const { options = defaultMapPropsToOptions, alias = 'Apollo' } = operationOptions;

  let mapPropsToOptions = options as (props: any) => MutationOpts;
  if (typeof mapPropsToOptions !== 'function') mapPropsToOptions = () => options as MutationOpts;

  return (
    WrappedComponent: React.ComponentType<TChildProps & TProps>,
  ): React.ComponentClass<TProps> => {
    const graphQLDisplayName = `${alias}(${getDisplayName(WrappedComponent)})`;
    class GraphQL extends GraphQLBase {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;
      render() {
        const props = this.props;
        const opts = mapPropsToOptions(props);
        let ref;
        if (operationOptions.withRef) {
          this.withRef = true;
          ref = this.setWrappedInstance;
        }
        if (!Boolean(opts.variables || !operation.variables.length)) {
          opts.variables = calculateVariablesFromProps(
            operation,
            props,
            graphQLDisplayName,
            getDisplayName(WrappedComponent),
          );
        }

        return (
          <Mutation {...opts} displayName={graphQLDisplayName} mutation={document} ignoreResults>
            {(mutate, _result) => {
              const name = operationOptions.name || 'mutate';
              let childProps = { [name]: mutate };
              if (operationOptions.props) {
                const newResult: OptionProps<TProps, TData> = {
                  [name]: mutate,
                  ownProps: props,
                };
                childProps = operationOptions.props(newResult);
              }

              return <WrappedComponent {...props} {...childProps} ref={ref} />;
            }}
          </Mutation>
        );
      }
    }

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  };
}
