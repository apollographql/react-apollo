# Change log

Expect active development and potentially significant breaking changes in the `0.x` track. We'll try to be diligent about releasing a `1.0` version in a timely fashion (ideally within 1 or 2 months), so that we can take advantage of SemVer to signify breaking changes from that point on.

### v0.4.5

- Feature: Allow options value to be an object instead of a method. [#144](https://github.com/apollostack/react-apollo/issues/144)
- Bug: Fixed issue with missing methods on initial props [#142](https://github.com/apollostack/react-apollo/issues/142)
- Bug: Fixed oddity with multi nested enhancers on SSR [#141](https://github.com/apollostack/react-apollo/issues/141)

### v0.4.4

- Bug: Fixed issue with variable merging [#139](https://github.com/apollostack/react-apollo/pull/139)

### v0.4.3

- Feature: Support a different store in the tree that is immutable (support immutable redux) [#137](https://github.com/apollostack/react-apollo/pull/137)

### v0.4.2

- Bug: Fixed refetch methods when no result is returned

### v0.4.1

- BREAKING Feature: [Brand new API! See the docs for more information](http://docs.apollostack.com/apollo-client/react.html);

### v0.3.20

- Bug: Fixed loading state on refetch more when data doesn't change
- Feature: added fetchMore [#123](https://github.com/apollostack/react-apollo/pull/123)

### v0.3.19

- Bug: Retain compatibility with version 0.3.0 of Apollo Client via a backcompat shim. [#109](https://github.com/apollostack/react-apollo/pull/109)

### v0.3.18

- Feature: Support 0.4.0 of Apollo Client, and pass through new mutation options [#105](https://github.com/apollostack/react-apollo/pull/105) [#106](https://github.com/apollostack/react-apollo/pull/106)

### v0.3.17

- Bug: Fixed but where SSR wouldn't get calculated props from redux actions [#103](https://github.com/apollostack/react-apollo/pull/103)

### v0.3.16

- Feature: integrated SSR [#83](https://github.com/apollostack/react-apollo/pull/83)
- Feature: added ability to hoist statics on components [#99](https://github.com/apollostack/react-apollo/pull/99)
- Bug: Don't strip data away from the component when the query errors [#98](https://github.com/apollostack/react-apollo/pull/98)

### v0.3.15

- Bug: Fixed issue where react native would error on aggressive cloneing of client

### v0.3.14

- Feature: pass through all methods on apollo client

### v0.3.13

- Bug: fixed issue causing errors to be passed to apollo-client [#89](https://github.com/apollostack/react-apollo/pull/89)

### v0.3.11/12

- Bug: fixed overrendering of components on redux state changes

### v0.3.10

- Bug: fixed bug where SSR would fail due to later updates. This should also prevent unmounted components from throwing errors.

### v0.3.9

- Feature: provide add `watchQuery` to components via `connect`

### v.0.3.8

- Bug: Don't use old props on store change change

### v.0.3.7

- Bug: Reset loading state when a refetched query has returned

### v0.3.6

- Bug: Loading state is no longer true on uncalled mutations.
- Improvement: don't set the loading state to false if forceFetch is true

### v0.3.5

Return promise from the refetch method

### v0.3.4

- Bug: Fix bug where state / props weren't accurate when executing mutations.
- - Improvement: Increase performance by limiting re-renders and re-execution of queries.
Chore: Split tests to make them easier to maintain.

### v0.3.2 || v0.3.3 (publish fix)

- Feature: add `startPolling` and `stopPolling` to the prop object for queries
- Bug: Fix bug where full options were not being passed to watchQuery

### v0.3.1

- Feature: Support 0.3.0 of apollo-client

### v0.3.0

- Feature: Change Provider export to be ApolloProvider and use Provider from react-redux

### v0.2.1

- Feature: Support 0.1.0 and 0.2.0 of apollo-client

### v0.2.0

**Breaking change:**

- Feature: Remove `result` key in favor of dynamic key matching root fields of the query or mutation. (https://github.com/apollostack/react-apollo/pull/31)

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

- Bug: Get state directly from redux store internally

### v0.1.4

- Bug: Fix bug with willReceiveProps

### v0.1.2

Bug: - Adjust loading lifecycle marker to better match the behavior of apollo-client [#11](https://github.com/apollostack/react-apollo/pull/11)

### v0.1.1

Feature: - Update to support new observable API from apollo-client [#9](https://github.com/apollostack/react-apollo/pull/9)

### v0.1.0

Initial release. Brings in support for binding GraphQL data to components easily as well as perform mutations.

We didn't track changes before this version.
