import { compose } from '../../../src';

describe('compose', () => {
  it('Should reverse execute the array of functions', () => {
    const add = (x: number, y: number) => x + y;
    const square = (x: number) =>  x * x;
    const flow = compose(square, add);
    const result = flow(2, 2);
    expect(result).toBe(16);
  });

  it('Should error when an argument is not a function', () => {
    try {
      const square = (x: number) => x * x;
      const flow = compose('x', square);
      expect(false).toBeTruthy();
    } catch (e) {
      expect(true).toBeTruthy();
      expect(e.message).toEqual('In \"compose\" the argument at index \"1\" is not a function.');
    }
  });
})
