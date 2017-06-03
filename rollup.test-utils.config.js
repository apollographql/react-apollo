export default {
  entry: "lib/test-utils.js",
  dest: "lib/test-utils.js",
  format: "umd",
  sourceMap: true,
  moduleName: "react-apollo",
  onwarn,
};

function onwarn(message) {
  const suppressed = ["UNRESOLVED_IMPORT", "THIS_IS_UNDEFINED"];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}
