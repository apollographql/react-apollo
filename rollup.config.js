const minify = require('rollup-plugin-babel-minify');
const commonjs = require('rollup-plugin-commonjs');

export default {
  input: 'lib/index.js',
  output: {
    file: 'lib/react-apollo.umd.js',
    format: 'umd',
    name: 'react-apollo',
    sourcemap: false,
  },
  plugins: [commonjs(), minify()],
  onwarn,
};

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
