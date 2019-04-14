const { hasOwnProperty } = Object.prototype;

function is(x: any, y: any) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  }
  return x !== x && y !== y;
}

function isObject(obj: any): obj is { [key: string]: any } {
  return obj !== null && typeof obj === "object";
}

export default function shallowEqual(objA: any, objB: any) {
  if (is(objA, objB)) {
    return true;
  }

  if (!isObject(objA) || !isObject(objB)) {
    return false;
  }

  const keys = Object.keys(objA);

  if (keys.length !== Object.keys(objB).length) {
    return false;
  }

  return keys.every(
    key => hasOwnProperty.call(objB, key) && is(objA[key], objB[key]),
  );
}
