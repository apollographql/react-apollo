export default {
  entry: "lib/test-utils.js",
  dest: "lib/react-apollo.test-utils.umd.js",
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
