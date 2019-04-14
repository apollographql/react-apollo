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
  react: 'React',
  'ts-invariant': 'invariant',
  tslib: 'tslib',
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
      file: `${LIB_DIR}/react-common.esm.js`,
      format: 'esm',
      sourcemap: true,
      globals,
    },
    external,
    plugins: [
      node({ mainFields: ['module'] }),
      typescriptPlugin({
        typescript,
        tsconfig: './config/tsconfig.json',
        clean: true,
      }),
      invariantPlugin(),
    ],
    onwarn,
  },
  {
    input: `${LIB_DIR}/react-common.esm.js`,
    output: {
      file: `${LIB_DIR}/react-common.cjs.js`,
      format: 'cjs',
      name: 'react-common',
      globals,
    },
    external,
    onwarn,
  },
  {
    input: `${LIB_DIR}/react-common.esm.js`,
    output: {
      file: `${LIB_DIR}/react-common.umd.js`,
      format: 'umd',
      name: 'react-common',
      globals,
    },
    external,
    onwarn,
  },
  {
    input: `${LIB_DIR}/react-common.esm.js`,
    output: {
      file: './meta/bundlesize/bundlesize.js',
      format: 'cjs',
      name: 'react-common',
      globals,
    },
    external,
    plugins: [
      uglify({
        mangle: {
          toplevel: true,
        },
        compress: {
          global_defs: {
            '@process.env.NODE_ENV': JSON.stringify('production'),
          },
        },
      }),
    ],
    onwarn,
  },
];
