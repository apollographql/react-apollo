const minify = require('rollup-plugin-babel-minify');

export default {
  input: 'lib/test-utils.js',
  output: {
    file: 'lib/umd/test-utils.js',
    format: 'umd',
    name: 'react-apollo',
    sourcemap: true,
  },
  plugins: [minify()],
  onwarn,
};

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
