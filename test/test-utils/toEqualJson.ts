declare namespace jest {
  interface Matchers<R> {
    toEqualJson(expected: any): R;
  }
}

/**
 * Apollo-client adds Symbols to the data in the store. In order to make
 * assertions easier the toEqualJson method is used to strip a data object of any
 * Symbols and then run an equal check on the stripped object.
 */
const toEqualJson = (received: any, expected: any) => {
  try {
    expect(JSON.parse(JSON.stringify(received))).toEqual(expected);
    return {
      pass: true,
      // TODO: This method fails if we call expect(received).not.toEqualJson(expected)
      // because there is no message yet.
      message: () => '',
    };
  } catch (e) {
    return {
      pass: false,
      message: () => e,
    };
  }
};

expect.extend({
  toEqualJson,
});
