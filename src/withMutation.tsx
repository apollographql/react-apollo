import * as React from 'react';

import { DocumentNode } from 'graphql';
// import {
//   MutationOpts,
//   OperationOption,
//   QueryOpts,
//   GraphqlQueryControls,
//   MutationFunc,
//   OptionProps,
//   DataProps,
//   MutateProps,
// } from './types';
// import { OperationVariables } from './index';

import Mutation from './Mutation';

const withMutation = (
  mutation: DocumentNode,
  operationOptions = {},
) => Component => {
  return props => {
    return (
      <Mutation mutation={mutation}>
        {mutate => {
          const clientProps = calculateComponentProps(
            mutate,
            props,
            operationOptions,
          );
          
          return <Component {...props} {...clientProps} />;
        }}
      </Mutation>
    );
  };
};

export default withMutation;

const calculateComponentProps = (mutate, ownProps, operationOptions) => {
  const mapResultToProps = operationOptions.props;

  if (mapResultToProps) {
    const newResult = {
      mutate,
      ownProps,
    };
    return mapResultToProps(newResult);
  }

  return { mutate };
};
