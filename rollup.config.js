import commonjs from 'rollup-plugin-commonjs';
import node from 'rollup-plugin-node-resolve';
import { uglify } from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import filesize from 'rollup-plugin-filesize';

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

function esm(inputFile, outputFile) {
  return {
    input: inputFile,
    output: {
      file: outputFile,
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      node({
        module: true,
        only: ['tslib']
      }),
      typescriptPlugin({ typescript }),
      filesize(),
    ],
    onwarn,
  }
}

function umd(inputFile, outputFile) {
  return {
    input: inputFile,
    output: {
      file: outputFile,
      format: 'umd',
      name: 'react-apollo',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      node({
        module: true,
        only: ['tslib']
      }),
      typescriptPlugin({ typescript }),
    ],
    onwarn,
  };
}

export default [
  // for server
  umd("src/index.ts",
      "lib/react-apollo.umd.js"),
  // for test-utils
  umd("src/test-utils.tsx",
      "lib/test-utils.js"),
  // for test-links
  umd("src/test-links.ts",
      "lib/test-links.js"),
  // Enable `import { walkTree } from "react-apollo/walkTree"`
  umd("src/walkTree.ts",
      "lib/walkTree.js"),
  esm('src/index.ts', 'lib/react-apollo.esm.js'),
  // for filesize
  {
    input: 'lib/react-apollo.umd.js',
    output: {
      file: 'dist/bundlesize.js',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [
      // Is there a reason for not adding tslib here?
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
