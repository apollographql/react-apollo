import * as React from 'react';
const invariant = require('invariant');

import { OperationVariables } from './types';
import { DocumentType, IDocumentDefinition } from './parser';

export const defaultMapPropsToOptions = () => ({});
export const defaultMapResultToProps: <P>(props: P) => P = props => props;
export const defaultMapPropsToSkip = () => false;

export function getDisplayName<P>(WrappedComponent: React.ComponentType<P>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function calculateVariablesFromProps<TProps>(
  operation: IDocumentDefinition,
  props: TProps,
  graphQLDisplayName: string,
  wrapperName: string,
) {
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

export type RefSetter<TChildProps> = (ref: React.ComponentClass<TChildProps>) => void | void;

// base class for hocs to easily manage refs
export class GraphQLBase<TProps, TChildProps, TState = any> extends React.Component<
  TProps,
  TState
> {
  public withRef: boolean = false;
  // wrapped instance
  private wrappedInstance?: React.ComponentClass<TChildProps>;

  constructor(props: TProps) {
    super(props);
    this.setWrappedInstance = this.setWrappedInstance.bind(this);
  }

  getWrappedInstance() {
    invariant(
      this.withRef,
      `To access the wrapped instance, you need to specify ` + `{ withRef: true } in the options`,
    );

    return this.wrappedInstance;
  }

  setWrappedInstance(ref: React.ComponentClass<TChildProps>) {
    this.wrappedInstance = ref;
  }
}
