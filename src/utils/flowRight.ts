export function compose(...funcs: Function[]) {
  const functions = funcs.reverse();
  functions.forEach((fnc, i) => {
    if (typeof fnc !== 'function') {
      throw new Error(`In "compose" the argument at index "${i}" is not a function.`);
    }
  });
  return function (...args: any[]) {
    const [firstFunction, ...restFunctions] = functions
    let result = firstFunction.apply(null, args);
    restFunctions.forEach((fnc) => {
      result = fnc.call(null, result)
    });
    return result;
  }
}
