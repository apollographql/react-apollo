module.exports = function(api) {
  api.cache(true);
  return {
    plugins: [
      'annotate-pure-calls',
      'dev-expression',
    ],
    presets: [
      "@babel/preset-env"
    ],
  }
}