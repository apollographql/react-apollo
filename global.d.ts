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
