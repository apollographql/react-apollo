declare namespace jest {
  interface Matchers {
    toEqualJson(expected: any): boolean;
  }
}
