const minify = require('rollup-plugin-babel-minify');

export default {
  input: 'lib/index.js',
  output: {
    file: 'lib/umd/react-apollo.js',
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
