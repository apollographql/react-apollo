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
import { default as Query } from './Query';
import { default as Mutation } from './Mutation';

const defaultMapPropsToOptions = () => ({});
const defaultMapResultToProps: <P>(props: P) => P = props => props;
const defaultMapPropsToSkip = () => false;

function getDisplayName<P>(WrappedComponent: React.ComponentType<P>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

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
  // safety check on the operation
  const operation = parser(document);

  switch (operation.type) {
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
    const GraphQL = props => {
      const opts = mapPropsToOptions(props);

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

            return <WrappedComponent {...props} {...childProps} />;
          }}
        </Mutation>
      );
    };

    GraphQL.displayName = graphQLDisplayName;
    GraphQL.WrappedComponent = WrappedComponent;
    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  };
}

export function query<
  TProps extends TGraphQLVariables | {} = {},
  TData = {},
  TGraphQLVariables = {},
  TChildProps = Partial<DataProps<TData, TGraphQLVariables>>
>(
  document: DocumentNode,
  operationOptions: OperationOption<TProps, TData, TGraphQLVariables, TChildProps> = {},
) {
  // this is memozied so if coming from `graphql` there is nearly no extra cost
  const operation = parser(document);
  // extract options
  const {
    options = defaultMapPropsToOptions,
    skip = defaultMapPropsToSkip,
    alias = 'Apollo',
  } = operationOptions;

  let mapPropsToOptions = options as (props: any) => QueryOpts;
  if (typeof mapPropsToOptions !== 'function') mapPropsToOptions = () => options as QueryOpts;

  let mapPropsToSkip = skip as (props: any) => boolean;
  if (typeof mapPropsToSkip !== 'function') mapPropsToSkip = () => skip as any;

  // allow for advanced referential equality checks
  let lastResultProps;
  return (
    WrappedComponent: React.ComponentType<TChildProps & TProps>,
  ): React.ComponentClass<TProps> => {
    const graphQLDisplayName = `${alias}(${getDisplayName(WrappedComponent)})`;
    const GraphQL = props => {
      const skip = mapPropsToSkip(props);
      const opts = skip ? Object.create(null) : mapPropsToOptions(props);

      if (!skip && !Boolean(opts.variables || !operation.variables.length)) {
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
          skip={skip}
          query={document}
          warnUnhandledError
        >
          {({ client, ...r }) => {
            if (r.error) {
              const error = r.error;

              // Define the error property on the data object. If the user does
              // not get the error object from `data` within 10 milliseconds
              // then we will log the error to the console.
              //
              // 10 milliseconds is an arbitrary number picked to work around any
              // potential asynchrony in React rendering. It is not super important
              // that the error be logged ASAP, but 10 ms is enough to make it
              // _feel_ like it was logged ASAP while still tolerating asynchrony.
              let logErrorTimeoutId = setTimeout(() => {
                if (error) {
                  let errorMessage = error;
                  if (error.stack) {
                    errorMessage = error.stack.includes(error.message)
                      ? error.stack
                      : `${error.message}\n${error.stack}`;
                  }

                  console.error(`Unhandled (in react-apollo:${graphQLDisplayName})`, errorMessage);
                }
              }, 10);
              Object.defineProperty(r, 'error', {
                configurable: true,
                enumerable: true,
                get: () => {
                  clearTimeout(logErrorTimeoutId);
                  return error;
                },
              });
            }
            // if we have skipped, no reason to manage any reshaping
            if (skip) return <WrappedComponent {...props} />;
            // the HOC's historically hoisted the data from the execution result
            // up onto the result since it was passed as a nested prop
            // we massage the Query components shape here to replicate that
            const result = Object.assign(r, r.data || {});
            const name = operationOptions.name || 'data';
            let childProps = { [name]: result };
            if (operationOptions.props) {
              const newResult: OptionProps<TProps, TData> = {
                [name]: result,
                ownProps: props,
              };
              lastResultProps = operationOptions.props(newResult, lastResultProps);
              childProps = lastResultProps;
            }

            return <WrappedComponent {...props} {...childProps} />;
          }}
        </Query>
      );
    };
    GraphQL.displayName = graphQLDisplayName;
    GraphQL.WrappedComponent = WrappedComponent;
    // Make sure we preserve any custom statics on the original component.
    return hoistNonReactStatics(GraphQL, WrappedComponent, {});
  };
}

function calculateVariablesFromProps(operation, props, graphQLDisplayName, wrapperName) {
  let variables: OperationVariables = {};
  for (let { variable, type } of operation.variables) {
    if (!variable.name || !variable.name.value) continue;

    const variableName = variable.name.value;
    const variableProp = (props as any)[variableName];

    if (typeof variableProp !== 'undefined') {
      variables[variableName] = variableProp;
      continue;
    }

    // allow optional props
    if (type.kind !== 'NonNullType') {
      variables[variableName] = null;
      continue;
    }

    if (operation.type === DocumentType.Mutation) return;
    invariant(
      typeof variableProp !== 'undefined',
      `The operation '${operation.name}' wrapping '${wrapperName}' ` +
        `is expecting a variable: '${variable.name.value}' but it was not found in the props ` +
        `passed to '${graphQLDisplayName}'`,
    );
  }
  return variables;
}
