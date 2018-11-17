import commonjs from 'rollup-plugin-commonjs';
import node from 'rollup-plugin-node-resolve';
import { uglify } from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

export default [
  // for browser
  {
    input: 'lib/browser.js',
    output: {
      file: 'lib/react-apollo.browser.umd.js',
      format: 'umd',
      name: 'react-apollo',
      sourcemap: true,
      exports: 'named',
    },
    onwarn,
  },
  // for server
  {
    input: 'lib/index.js',
    output: {
      file: 'lib/react-apollo.umd.js',
      format: 'umd',
      name: 'react-apollo',
      sourcemap: false,
      exports: 'named',
    },
    onwarn,
  },
  // for React Native
  {
    input: 'lib/index.js',
    output: {
      // https://facebook.github.io/react-native/docs/platform-specific-code#platform-specific-extensions
      file: 'lib/react-apollo.umd.native.js',
      format: 'umd',
      name: 'react-apollo',
      sourcemap: false,
      exports: 'named',
    },
    plugins: [{
      resolveId(id, parentId) {
        if (id.split('/').pop().split('.').shift() === 'defaultRenderFunction') {
          // Don't try to include lib/defaultRenderFunction.* in the bundle.
          // The React Native bundler should pick up lib/defaultRenderFunction.native.js
          // instead of lib/defaultRenderFunction.js because of this override.
          return false;
        }
        // Return nothing to fall through to default resolution logic.
      }
    }],
    onwarn,
  },
  // for test-utils
  {
    input: 'lib/test-utils.js',
    output: {
      file: 'lib/test-utils.js',
      format: 'umd',
      name: 'react-apollo',
      sourcemap: false,
      exports: 'named',
    },
    onwarn,
  },
  // for filesize
  {
    input: 'lib/react-apollo.browser.umd.js',
    output: {
      file: 'dist/bundlesize.js',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [
      node(),
      commonjs({
        ignore: [
          'react',
          'react-dom/server',
          'apollo-client',
          'graphql',
          'graphql-tag',
        ],
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      uglify(),
    ],
    onwarn,
  },
];
