import { ComponentType as Component, ComponentClass } from 'react';

interface ComponentEnhancer<TInner, TOuter> {
  (component: Component<TInner>): ComponentClass<TOuter>;
}

export function compose<TInner, TOuter>(...funcs: Function[]): ComponentEnhancer<TInner, TOuter> {
  const functions = funcs.reverse();
  return function (...args: any[]) {
    const [firstFunction, ...restFunctions] = functions
    let result = firstFunction.apply(null, args);
    restFunctions.forEach((fnc) => {
      result = fnc.call(null, result)
    });
    return result;
  }
}
