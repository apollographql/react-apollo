import React from 'react';
import { DocumentNode } from 'graphql';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { parser, BaseMutationOptions } from '@apollo/react-common';
import { Mutation } from '@apollo/react-components';

import {
  defaultMapPropsToOptions,
  getDisplayName,
  calculateVariablesFromProps,
  GraphQLBase
} from './hoc-utils';
import { OperationOption, OptionProps, MutateProps } from './types';

export function withMutation<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = MutateProps<TData, TGraphQLVariables>
>(
  document: DocumentNode,
  operationOptions: OperationOption<
    TProps,
    TData,
    TGraphQLVariables,
    TChildProps
  > = {}
) {
  // this is memoized so if coming from `graphql` there is nearly no extra cost
  const operation = parser(document);
  // extract options

  const {
    options = defaultMapPropsToOptions,
    alias = 'Apollo'
  } = operationOptions;

  let mapPropsToOptions = options as (props: any) => BaseMutationOptions;
  if (typeof mapPropsToOptions !== 'function')
    mapPropsToOptions = () => options as BaseMutationOptions;

  return (
    WrappedComponent: React.ComponentType<TProps & TChildProps>
  ): React.ComponentClass<TProps> => {
    const graphQLDisplayName = `${alias}(${getDisplayName(WrappedComponent)})`;
    class GraphQL extends GraphQLBase<TProps, TChildProps> {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;
      render() {
        let props = this.props;
        const opts = mapPropsToOptions(props);

        if (operationOptions.withRef) {
          this.withRef = true;
          props = Object.assign({}, props, {
            ref: this.setWrappedInstance
          });
        }
        if (!opts.variables && operation.variables.length > 0) {
          opts.variables = calculateVariablesFromProps(operation, props);
        }

        return (
          <Mutation {...opts} mutation={document} ignoreResults>
            {(mutate: any, _result: any) => {
              const name = operationOptions.name || 'mutate';
              let childProps = { [name]: mutate };
              if (operationOptions.props) {
                const newResult: OptionProps<
                  TProps,
                  TData,
                  TGraphQLVariables
                > = {
                  [name]: mutate,
                  ownProps: props
                };
                childProps = operationOptions.props(newResult) as any;
              }

              return (
                <WrappedComponent {...props as TProps} {...childProps as any} />
              );
            }}
          </Mutation>
        );
      }
    }

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  };
}
