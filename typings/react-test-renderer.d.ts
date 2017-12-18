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
