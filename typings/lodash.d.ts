/*
  LODASH
*/
declare module 'lodash.isobject' {
  import main = require('lodash/isObject');
  export = main;
}

declare module 'lodash.isequal' {
  import main = require('lodash/isEqual');
  export = main;
}

declare module 'lodash.flatten' {
  import main = require('lodash/flatten');
  export = main;
}

declare module 'lodash.pick' {
  import main = require('lodash/pick');
  export = main;
}

declare module 'hoist-non-react-statics' {
  /**
   * Copies any static properties present on `source` to `target`, excluding those that are specific
   * to React.
   *
   * Returns the target component.
   */
  function hoistNonReactStatics(
    targetComponent: any,
    sourceComponent: any,
    customStatics: { [name: string]: boolean },
  ): any;
  namespace hoistNonReactStatics {

  }
  export = hoistNonReactStatics;
}

declare module 'redux-loop' {
  function combineReducers(
    reducers: any,
    state?: any,
    get?: any,
    set?: any,
  ): any;
  function install(): any;
}

declare module 'react-test-renderer' {
  function create(elements: any): any;
}
