/*
  LODASH
*/
declare module 'lodash.isobject' {
  import main = require('~lodash/index');
  export = main.isObject;
}

declare module 'lodash.isequal' {
  import main = require('~lodash/index');
  export = main.isEqual;
}

declare module 'hoist-non-react-statics' {
  interface Component {
    new(...args:any[]);
  }

  /**
   * Copies any static properties present on `source` to `target`, excluding those that are specific
   * to React.
   *
   * Returns the target component.
   */
  function hoistNonReactStatics(targetComponent:Component, sourceComponent:Component):Component;
  namespace hoistNonReactStatics {}
  export = hoistNonReactStatics;
}
