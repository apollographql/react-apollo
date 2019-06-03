import node from 'rollup-plugin-node-resolve';
import { uglify } from 'rollup-plugin-uglify';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import invariantPlugin from 'rollup-plugin-invariant';

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

const globals = {
  'apollo-client': 'apollo.core',
  react: 'React',
  'prop-types': 'PropTypes',
  'ts-invariant': 'invariant',
  tslib: 'tslib',
  '@apollo/react-common': 'apolloReactCommon',
  'fast-json-stable-stringify': 'stringify',
  'hoist-non-react-statics': 'hoistNonReactStatics',
  'zen-observable': 'zenObservable'
};

function external(id) {
  return Object.prototype.hasOwnProperty.call(globals, id);
}

const SRC_DIR = './src';
const LIB_DIR = './lib';

export default [
  {
    input: `${SRC_DIR}/index.ts`,
    output: {
      file: `${LIB_DIR}/react-apollo.esm.js`,
      format: 'esm',
      sourcemap: true,
      globals
    },
    external,
    plugins: [
      node({ mainFields: ['module'] }),
      typescriptPlugin({
        typescript,
        tsconfig: './config/tsconfig.json',
        clean: true
      }),
      invariantPlugin()
    ],
    onwarn
  },
  {
    input: `${LIB_DIR}/react-apollo.esm.js`,
    output: {
      file: `${LIB_DIR}/react-apollo.cjs.js`,
      format: 'cjs',
      name: 'react-apollo',
      globals
    },
    external,
    onwarn
  },
  {
    input: `${LIB_DIR}/react-apollo.esm.js`,
    output: {
      file: `${LIB_DIR}/react-apollo.umd.js`,
      format: 'umd',
      name: 'react-apollo',
      globals
    },
    external,
    onwarn
  },
  {
    input: `${LIB_DIR}/react-apollo.esm.js`,
    output: {
      file: './meta/bundlesize/bundlesize.js',
      format: 'cjs',
      name: 'react-apollo',
      globals
    },
    external,
    plugins: [
      uglify({
        mangle: {
          toplevel: true
        },
        compress: {
          global_defs: {
            '@process.env.NODE_ENV': JSON.stringify('production')
          }
        }
      })
    ],
    onwarn
  }
];
