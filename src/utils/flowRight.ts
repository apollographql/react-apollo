export default(...funcs: any[]) => {
  const functions = funcs.reverse();
  functions.forEach((fnc, i) => {
    if (typeof fnc !== 'function') {
      throw new Error(`flowRight at index ${i} is not a function`);
    }
  });
  return function (...args: [any]) {
    let result = functions[0].apply(null, args);
    functions.forEach((fnc) => {
      result = fnc.call(null, result)
    });
    return result;
  }
}
