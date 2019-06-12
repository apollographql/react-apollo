module.exports = (existingModuleMap, library) => ({
  ...existingModuleMap,
  '\\.\\./Query': library,
  '\\.\\./Mutation': library,
  '\\.\\./Subscription': library
});
