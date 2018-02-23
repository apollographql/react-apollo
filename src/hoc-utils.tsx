import * as React from 'react';
const invariant = require('invariant');
const hoistNonReactStatics = require('hoist-non-react-statics');

export const defaultMapPropsToOptions = () => ({});
export const defaultMapResultToProps: <P>(props: P) => P = props => props;
export const defaultMapPropsToSkip = () => false;

export function getDisplayName<P>(WrappedComponent: React.ComponentType<P>) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export function calculateVariablesFromProps(operation, props, graphQLDisplayName, wrapperName) {
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

// base class for hocs to easily manage refs
export class GraphQLBase extends React.Component<GraphQLProps> {
  // wrapped instance
  private wrappedInstance: any;
  private withRef: boolean;

  constructor(props) {
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
