import React from 'react';
import { ApolloError } from 'apollo-client';
import { DocumentNode } from 'graphql';
const hoistNonReactStatics = require('hoist-non-react-statics');

import { parser } from './parser';
import { OperationOption, QueryOpts, OptionProps, DataProps } from './types';
import { default as Query } from './Query';
import {
  getDisplayName,
  GraphQLBase,
  calculateVariablesFromProps,
  defaultMapPropsToOptions,
  defaultMapPropsToSkip,
} from './hoc-utils';

export function query<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = Partial<DataProps<TData, TGraphQLVariables>>
>(
  document: DocumentNode,
  operationOptions: OperationOption<TProps, TData, TGraphQLVariables, TChildProps> = {},
) {
  // this is memoized so if coming from `graphql` there is nearly no extra cost
  const operation = parser(document);
  // extract options
  const {
    options = defaultMapPropsToOptions,
    skip = defaultMapPropsToSkip,
    alias = 'Apollo',
  } = operationOptions;

  let mapPropsToOptions = options as (props: any) => QueryOpts;
  if (typeof mapPropsToOptions !== 'function') {
    mapPropsToOptions = () => options as QueryOpts;
  }

  let mapPropsToSkip = skip as (props: any) => boolean;
  if (typeof mapPropsToSkip !== 'function') {
    mapPropsToSkip = () => skip as any;
  }

  // allow for advanced referential equality checks
  let lastResultProps: TChildProps | void;
  return (
    WrappedComponent: React.ComponentType<TChildProps & TProps>,
  ): React.ComponentClass<TProps> => {
    const graphQLDisplayName = `${alias}(${getDisplayName(WrappedComponent)})`;
    class GraphQL extends GraphQLBase<TProps, TChildProps> {
      static displayName = graphQLDisplayName;
      static WrappedComponent = WrappedComponent;

      render() {
        let props = this.props;
        const shouldSkip = mapPropsToSkip(props);
        const opts = shouldSkip ? Object.create(null) : { ...mapPropsToOptions(props) };

        if (!shouldSkip && !opts.variables && operation.variables.length > 0) {
          opts.variables = calculateVariablesFromProps(
            operation,
            props,
            graphQLDisplayName,
            getDisplayName(WrappedComponent),
          );
        }
        return (
          <Query
            {...opts}
            displayName={graphQLDisplayName}
            skip={shouldSkip}
            query={document}
            warnUnhandledError
          >
            {({ client: _, data, ...r }) => {
              if (operationOptions.withRef) {
                this.withRef = true;
                props = Object.assign({}, props, {
                  ref: this.setWrappedInstance,
                });
              }
              // if we have skipped, no reason to manage any reshaping
              if (shouldSkip) return <WrappedComponent {...props} />;
              // the HOC's historically hoisted the data from the execution result
              // up onto the result since it was passed as a nested prop
              // we massage the Query components shape here to replicate that
              const result = Object.assign(r, data || {});
              const name = operationOptions.name || 'data';
              let childProps = { [name]: result };
              if (operationOptions.props) {
                const newResult: OptionProps<TProps, TData, TGraphQLVariables> = {
                  [name]: result,
                  ownProps: props as TProps,
                };
                lastResultProps = operationOptions.props(newResult, lastResultProps);
                childProps = lastResultProps;
              }

              return <WrappedComponent {...props} {...childProps} />;
            }}
          </Query>
        );
      }
    }

    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  };
}
