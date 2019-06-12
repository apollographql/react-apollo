module.exports = (existingModuleMap, library) => ({
  ...existingModuleMap,
  '\\.\\./ApolloProvider': library,
  '\\.\\./ApolloConsumer': library,
  '\\.\\./ApolloContext': library
});
