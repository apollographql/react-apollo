/// <reference path="./toEqualJson.d.ts" />
// @see https://github.com/fluffynuts/polymer-ts-scratch/blob/master/src/specs/test-utils/jasmine-matchers/polymer-matchers.d.ts
import CustomMatcherResult = jasmine.CustomMatcherResult;

(function() {
  function failWith(message) {
    return {
      pass: false,
      message: message,
    };
  }

  function doAssertions(logicFunc): CustomMatcherResult {
    try {
      logicFunc();
      return { pass: true, message: '' };
    } catch (e) {
      return failWith(e.toString());
    }
  }

  beforeAll(() => {
    jasmine.addMatchers({
      toEqualJson: function(message?: string): jasmine.CustomMatcher {
        return {
          compare: function(actual: any, expected: any) {
            return doAssertions(() => {
              expect(JSON.parse(JSON.stringify(actual))).toEqual(
                expected,
                message,
              );
            });
          },
        };
      },
    });
  });
})();
