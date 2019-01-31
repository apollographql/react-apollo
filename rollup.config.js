import node from 'rollup-plugin-node-resolve';
import { uglify } from 'rollup-plugin-uglify';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import filesize from 'rollup-plugin-filesize';
import invariantPlugin from './rollup/plugin-invariant';

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'lib/react-apollo.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      node({
        module: true,
        only: ['tslib']
      }),
      typescriptPlugin({ typescript }),
      invariantPlugin(),
      filesize(),
    ],
    onwarn,
  },
  {
    input: 'lib/react-apollo.esm.js',
    output: {
      file: 'lib/react-apollo.cjs.js',
      format: 'cjs',
      name: 'react-apollo'
    },
    onwarn,
  },
  {
    input: 'lib/react-apollo.esm.js',
    output: {
      file: 'lib/react-apollo.umd.js',
      format: 'umd',
      name: 'react-apollo'
    },
    onwarn,
  },
  {
    input: 'lib/react-apollo.esm.js',
    output: {
      file: 'dist/bundlesize.js',
      format: 'cjs',
      name: 'react-apollo'
    },
    plugins: [
      uglify({
        mangle: {
          toplevel: true,
        },
        compress: {
          global_defs: {
            "@process.env.NODE_ENV": JSON.stringify("production"),
          },
        }
      }),
    ],
    onwarn,
  },
];
