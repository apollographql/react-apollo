function compareValue(base: string | number, target: string | number): boolean {
  return base === target;
}

function compareArrays(base: Array<any>, target: Array<any>): boolean {
  if (base.length !== target.length) return false;
  return base.every((value: any, index: number) => compareHelper(value, target[index]));
}

function compareObjects(base: { [property: string]: any }, target: { [property: string]: any }): boolean {
  const baseKeys = Object.keys(base);
  const targetKeys = Object.keys(target);
  if (baseKeys.length !== targetKeys.length) return false;
  return baseKeys.every((key: string) => compareHelper(base[key], target[key]));
}

function compareHelper(base: any, target: any): boolean {
  if (typeof base !== typeof target) return false;
  if (Array.isArray(base)) return compareArrays(base, target);
  if (typeof base === 'object' && base !== undefined && base !== null) return compareObjects(base, target);
  return compareValue(base, target);
}

export default function(base: any, target: any): boolean {
  return compareHelper(base, target);
}
