module.exports = (existingModuleMap, library) => ({
  ...existingModuleMap,
  '\\.\\./graphql': library,
  '\\.\\./types': library,
  '\\.\\./withApollo': library
});
