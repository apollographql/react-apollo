function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

export default [
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
];
