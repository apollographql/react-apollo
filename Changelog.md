# Change log

Expect active development and potentially significant breaking changes in the `0.x` track. We'll try to be diligent about releasing a `1.0` version in a timely fashion (ideally within 1 or 2 months), so that we can take advantage of SemVer to signify breaking changes from that point on.

### v.0.3.8

Bug: Don't use old props on store change change

### v.0.3.7

Bug: Reset loading state when a refetched query has returned

### v0.3.6

Bug: Loading state is no longer true on uncalled mutations.
Improvement: don't set the loading state to false if forceFetch is true

### v0.3.5

Return promise from the refetch method

### v0.3.4

Bug: Fix bug where state / props weren't accurate when executing mutations.
Perf: Increase performance by limiting re-renders and re-execution of queries.
Chore: Split tests to make them easier to maintain.

### v0.3.2 || v0.3.3 (publish fix)

Feature: add `startPolling` and `stopPolling` to the prop object for queries
Bug: Fix bug where full options were not being passed to watchQuery

### v0.3.1

Support 0.3.0 of apollo-client

### v0.3.0

Change Provider export to be ApolloProvider and use Provider from react-redux

### v0.2.1

Support 0.1.0 and 0.2.0 of apollo-client

### v0.2.0

**Breaking change:**

Remove `result` key in favor of dynamic key matching root fields of the query or mutation. (https://github.com/apollostack/react-apollo/pull/31)

```js
{
  loading: false,
  result: {
    posts: []
  }
}
```

becomes

```js
{
  loading: false,
  posts: []
}
```

### v0.1.5

Get state directly from redux store internally

### v0.1.4

Fix bug with willReceiveProps

### v0.1.2

Adjust loading lifecycle marker to better match the behavior of apollo-client (https://github.com/apollostack/react-apollo/pull/11)

### v0.1.1

Update to support new observable API from apollo-client (https://github.com/apollostack/react-apollo/pull/9)

### v0.1.0

Initial release. Brings in support for binding GraphQL data to components easily as well as perform mutations.

We didn't track changes before this version.
