const minify = require('rollup-plugin-babel-minify');

export default {
  input: 'lib/index.js',
  output: {
    file: 'lib/bundlesize/react-apollo.js',
    format: 'cjs',
    name: 'react-apollo',
    sourcemap: false,
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