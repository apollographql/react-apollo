import { isEqual } from '../../../src/test-utils';

const baseItem1 = 'string';
const baseItem2 = 'string';
const baseItem3 = 'stri';

const bigItem1 = {
  value: 'x',
  array: ['x', 'y', { x: 'y' }],
  object: {
    value: 'x',
  }
}

const bigItem2 = {
  value: 'x',
  array: ['x', 'y', { x: 'y' }],
  object: {
    value: 'x',
  }
}

const bigItem3 = {
  value: 'y',
  array: ['x', 'y', { x: 'y' }],
  object: {
    value: 'x',
  }
}

const bigItem4 = {
  value: 'x',
  array: ['y', 'y', { x: 'y' }],
  object: {
    value: 'x',
  }
}

const bigItem5 = {
  value: 'x',
  array: ['x', 'y', { x: 'y' }],
  object: 'x'
}

describe('isEqual', () => {
  it('Should deeply equal check', () => {
    expect(isEqual(baseItem1, baseItem2)).toBeTruthy();
    expect(isEqual(bigItem1, bigItem2)).toBeTruthy();
    expect(isEqual(baseItem1, baseItem3)).toBeFalsy();
    expect(isEqual(bigItem1, bigItem3)).toBeFalsy();
    expect(isEqual(bigItem1, bigItem4)).toBeFalsy();
    expect(isEqual(bigItem1, bigItem5)).toBeFalsy();
  });
})
