/// <reference path="./toEqualJson.d.ts" />
// @see https://github.com/fluffynuts/polymer-ts-scratch/blob/master/src/specs/test-utils/jasmine-matchers/polymer-matchers.d.ts
(function() {
  function failWith(message) {
    return {
      pass: false,
      message: message,
    };
  }

  function doAssertions(logicFunc) {
    try {
      logicFunc();
      return { pass: true };
    } catch (e) {
      return failWith(e.toString());
    }
  }

  beforeAll(() => {
    jasmine.addMatchers({
      toEqualJson: function(): // util: jasmine.MatchersUtil,
      // customEqualityTesters: Array<jasmine.CustomEqualityTester>,
      jasmine.CustomMatcher {
        return {
          compare: function(actual: any, expected: any) {
            return doAssertions(() => {
              expect(JSON.parse(JSON.stringify(actual))).toEqual(expected);
            });
          },
        };
      },
    });
  });
})();
