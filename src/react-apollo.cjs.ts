// This file is a temporary hack used by `test-utils` to make sure
// the CJS bundled version of the codebase (via `lib/react-apollo.cjs.js`) is
// used when running tests.
//
// See: https://github.com/apollographql/react-apollo/pull/2907
//
// This hack is temporary as the `test-utils` will be moved into their own
// repo in React Apollo 3.0.

export * from './index';
