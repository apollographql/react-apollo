import node from 'rollup-plugin-node-resolve';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

const globals = {
  'fast-json-stable-stringify': 'stringify',
  'zen-observable': 'zenObservable',
  optimism: 'wrap',
  react: 'React',
  'prop-types': 'PropTypes',
  'hoist-non-react-statics': 'hoistNonReactStatics',
  '@apollo/react-common': 'apolloReactCommon',
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
      file: `${LIB_DIR}/react-testing.esm.js`,
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
      }),
    ],
    onwarn,
  },
  {
    input: `${LIB_DIR}/react-testing.esm.js`,
    output: {
      file: `${LIB_DIR}/react-testing.cjs.js`,
      format: 'cjs',
      name: 'react-testing',
      globals,
    },
    external,
    onwarn,
  },
  {
    input: `${LIB_DIR}/react-testing.esm.js`,
    output: {
      file: `${LIB_DIR}/react-testing.umd.js`,
      format: 'umd',
      name: 'react-testing',
      globals,
    },
    external,
    onwarn,
  },
];
