declare module 'hoist-non-react-statics' {
  /**
   * Copies any static properties present on `source` to `target`, excluding those that are specific
   * to React.
   *
   * Returns the target component.
   */
  function hoistNonReactStatics<
    TTargetComponent extends React.ComponentType<any>,
    TSourceComponent extends React.ComponentType<any>
  >(
    targetComponent: TTargetComponent,
    sourceComponent: TSourceComponent,
    customStatics: { [name: string]: boolean },
  ): TTargetComponent;
  namespace hoistNonReactStatics {

  }
  export = hoistNonReactStatics;
}
