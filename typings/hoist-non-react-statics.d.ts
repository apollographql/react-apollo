declare module 'hoist-non-react-statics' {
  /**
   * Copies any static properties present on `source` to `target`, excluding those that are specific
   * to React.
   *
   * Returns the target component.
   */
  function hoistNonReactStatics<TProps, TProps2>(
    targetComponent: React.ComponentClass<TProps>,
    sourceComponent: React.ComponentType<TProps2>,
    customStatics: { [name: string]: boolean },
  ): React.ComponentClass<TProps>;
  namespace hoistNonReactStatics {

  }
  export = hoistNonReactStatics;
}
