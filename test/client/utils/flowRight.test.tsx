import { compose } from '../../../src';

describe('compose', () => {
  it('Should reverse execute the array of functions', () => {
    const add = (x: number, y: number) => x + y;
    const square = (x: number) =>  x * x;
    const flow = compose(square, add);
    const result = flow(2, 2);
    expect(result).toBe(16);
  });
})
