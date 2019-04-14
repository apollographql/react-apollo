export function compose(...funcs: Function[]) {
  const functions = funcs.reverse();
  return function(...args: any[]) {
    const [firstFunction, ...restFunctions] = functions;
    let result = firstFunction.apply(null, args);
    restFunctions.forEach(fnc => {
      result = fnc.call(null, result);
    });
    return result;
  };
}
