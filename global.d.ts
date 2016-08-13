/*
  LODASH
*/
declare module 'lodash.isobject' {
  import main = require('lodash');
  export = main.isObject;
}

declare module 'lodash.isequal' {
  import main = require('lodash');
  export = main.isEqual;
}


declare module 'hoist-non-react-statics' {
  /**
   * Copies any static properties present on `source` to `target`, excluding those that are specific
   * to React.
   *
   * Returns the target component.
   */
  function hoistNonReactStatics(targetComponent: any, sourceComponent: any): any;
  namespace hoistNonReactStatics {}
  export = hoistNonReactStatics;
}

declare module 'lodash.flatten' {
  import main = require('lodash');
  export = main.flatten;
}

declare module 'redux-loop' {
  function combineReducers(reducers: any): any;
  function install(): any;
}
