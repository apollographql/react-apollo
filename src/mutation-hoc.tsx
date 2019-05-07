import * as React from 'react';
import { DocumentNode } from 'graphql';
import hoistNonReactStatics from 'hoist-non-react-statics';

import { parser } from './parser';
import { MutationOpts, OperationOption, OptionProps, MutateProps } from './types';
import { default as Mutation } from './Mutation';
import {
  defaultMapPropsToOptions,
  getDisplayName,
  calculateVariablesFromProps,
  GraphQLBase,
} from './hoc-utils';

export function withMutation<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = MutateProps<TData, TGraphQLVariables>
>(
  document: DocumentNode,
  operationOptions: OperationOption<TProps, TData, TGraphQLVariables, TChildProps> = {},
) {
  // this is memoized so if coming from `graphql` there is nearly no extra cost
  const operation = parser(document);
  // extract options

  const { options = defaultMapPropsToOptions, alias = 'Apollo' } = operationOptions;

  let mapPropsToOptions = options as (props: any) => MutationOpts;
  if (typeof mapPropsToOptions !== 'function') mapPropsToOptions = () => options as MutationOpts;

  return (
    WrappedComponent: React.ComponentType<TProps & TChildProps>,
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
            ref: this.setWrappedInstance,
          });
        }
        if (!opts.variables && operation.variables.length > 0) {
          opts.variables = calculateVariablesFromProps(
            operation,
            props,
          );
        }

        return (
          <Mutation {...opts} mutation={document} ignoreResults>
            {(mutate, { data, ...r }) => {
              // the HOC's historically hoisted the data from the execution result
              // up onto the result since it was passed as a nested prop
              // we massage the Mutation component's shape here to replicate that
              // this matches the query HoC
              const result = Object.assign(r, data || {});
              const name = operationOptions.name || 'mutate';
              const resultName = operationOptions.name ? `${name}Result` : 'result';
              let childProps = { [name]: mutate, [resultName]: result };
              if (operationOptions.props) {
                const newResult: OptionProps<TProps, TData, TGraphQLVariables> = {
                  [name]: mutate,
                  [resultName]: result,
                  ownProps: props,
                };
                childProps = operationOptions.props(newResult) as any;
              }

              return (
                <WrappedComponent
                  {...props as TProps}
                  {...childProps as TChildProps}
                />
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
