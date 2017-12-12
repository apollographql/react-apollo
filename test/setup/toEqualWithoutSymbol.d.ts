declare namespace jasmine {
  interface Matchers<T> {
    toEqualWithoutSymbol(expected: any): boolean;
  }
}
