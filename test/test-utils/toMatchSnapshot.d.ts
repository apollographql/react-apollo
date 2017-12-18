// @rosskevin - no idea why it wouldn't find the jest matcher
declare namespace jasmine {
  interface Matchers {
    toMatchSnapshot(): boolean;
  }
}
