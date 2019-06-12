module.exports = (existingModuleMap, library) => ({
  ...existingModuleMap,
  '\\.\\./useApolloClient': library,
  '\\.\\./useQuery': library,
  '\\.\\./useMutation': library,
  '\\.\\./useSubscription': library
});
