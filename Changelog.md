# Change log

Expect active development and potentially significant breaking changes in the `0.x` track. We'll try to be diligent about releasing a `1.0` version in a timely fashion (ideally within 1 or 2 months), so that we can take advantage of SemVer to signify breaking changes from that point on.

### vNext

### 1.1.2
- Fix: Re-export all Apollo Client exports from react-apollo [PR #650](https://github.com/apollographql/react-apollo/pull/650)
- Chore: Include React 16 alpha in dependency version range [PR #647](https://github.com/apollographql/react-apollo/pull/647)

### 1.1.1
- Fix: move prop-types from devDependencies to dependencies [PR #656](https://github.com/apollographql/react-apollo/pull/656)

### 1.1.0 (deprecated)
- Pass cached data to the child component along with the error. [PR #548](https://github.com/apollographql/react-apollo/pull/548)
- Fix version lock down for peer dependency version of React. [PR #626](https://github.com/apollographql/react-apollo/pull/626)
- Switch `graphql-tag` dependency to `2.0.0`. This isn't really a breaking change because we only export `gql` from `react-apollo`.
- Fix: convert deprecated `React.PropTypes` to `PropTypes` provided by the `prop-types` package. [PR #628](https://github.com/apollographql/react-apollo/pull/628)

### 1.0.2
- Exposed `createBatchingNetworkInterface` from apollo-client so that it can be imported from react-apollo just like `createNetworkInterface`. [PR #618](https://github.com/apollographql/react-apollo/pull/618)

### 1.0.1
- Fix: Make sure recycled queries are in cache only mode so they do not trigger network requests. [PR #531](https://github.com/apollographql/react-apollo/pull/531)

### 1.0.0
- ApolloProvider now won't put its `store` on `context` unless it was given. [PR #550](https://github.com/apollographql/react-apollo/pull/550)
- MockedProvider now accepts a `store` prop to be passed to ApolloProvider so that react-redux store is not overwritten

### 1.0.0-rc.3
- Fix bug where `options` was mutated causing variables to not update appropriately. [PR #537](https://github.com/apollographql/react-apollo/pull/537)
- Make sure that all queries resolve or reject if an error was thrown when server side rendering. [PR #488](https://github.com/apollographql/react-apollo/pull/488)
- ApolloProvider now changes its client and store when those props change. [PR #479](https://github.com/apollographql/react-apollo/pull/479)

### 1.0.0-rc.1
- Update dependency to Apollo Client 1.0.0-rc.1 [PR #520](https://github.com/apollographql/react-apollo/pull/520)

### 0.13.3
- Make sure that the cached rendered element has the correct type before returning it. [PR #505](https://github.com/apollographql/react-apollo/pull/505)
- Move constructor initializing of props to componentWillMount. [PR #506](https://github.com/apollographql/react-apollo/pull/506) ([Issue #509](https://github.com/apollographql/react-apollo/issues/509)).

### 0.13.2
- Address deprecation warnings coming from `graphql-tag` [graphql-tag#54](https://github.com/apollographql/graphql-tag/issues/54)
- Make sure ApolloClient and gql are exported from browser bundle [PR #501](https://github.com/apollographql/react-apollo/pull/501)

### 0.13.1
- Add apollo-client ^0.10.0 to dependency range

### 0.13.0
- Make apollo-client and graphql-tag dependencies and re-export them from this package [PR #490](https://github.com/apollographql/react-apollo/pull/490)
- Print errors to console if they are not handled by component [PR #476](https://github.com/apollographql/react-apollo/pull/476)

### 0.12.0
- Update Apollo Client to 0.9.0 and bump a lot of other dependencies [PR #484](https://github.com/apollographql/react-apollo/pull/484)

### 0.11.2
- Remove `@types/chai` dev dependency which called a reference to the `chai` types in the production build. [PR #471](https://github.com/apollographql/react-apollo/pull/471)

### 0.11.1
- Fix `updateQueries` not running for queries attached to unmounted components. [PR #462](https://github.com/apollographql/react-apollo/pull/462)

### 0.10.1
- Fix wrong invariant sanity checks for GraphQL document [PR #457](https://github.com/apollostack/react-apollo/issues/457)

### 0.10.0
- Feature: [typescript] Add better typings to graphql HOC [Issue #379](https://github.com/apollostack/react-apollo/issues/379)

### 0.9.0
- Update apollo-client peerDependency to 0.8.0 [PR #438](https://github.com/apollostack/react-apollo/pull/438)

### 0.8.3
- Bug: [Issue #404](https://github.com/apollostack/react-apollo/issues/404) fix issue with network errors thrown when changing variables.
- Feature: Allow access to `withApollo`'s wrapped instance thanks to `{withRef: true}` option [Issue #331](https://github.com/apollostack/react-apollo/issues/331).
- Feature: Add an `alias` option to the `graphql` function to allow customizing the display name of the wrapped component ([Issue #354](https://github.com/apollostack/react-apollo/issues/354)).

### 0.8.2
- Chore: [PR #403](https://github.com/apollostack/react-apollo/pull/403) move react-dom to be an optional dependency for better react-native builds.

### 0.8.1
- Same as 0.8.0, but properly built

### 0.8.0 (deprecated - build was missing files)
- Update typings dependency from typed-grapqhl to @types/graphql [PR #393](https://github.com/apollostack/react-apollo/pull/393)
- Chore: [PR #390](https://github.com/apollostack/react-apollo/pull/390) gets rid of warning during queries test.

- Chore: [PR #391](https://github.com/apollostack/react-apollo/pull/391) gets rid of warnings during redux test.

- Feature: [PR #389](https://github.com/apollostack/react-apollo/pull/389) added a shouldResubscribe option to allow subscriptions to automatically resubscribe when props change.

### v0.7.4
- Identical to 0.7.2 because 0.7.3 contained breaking change (updated typings)

### v0.7.3 (deprecated - contained breaking changes)
- Chore: [PR #390](https://github.com/apollostack/react-apollo/pull/390) gets rid of warning during queries test.

- Chore: [PR #391](https://github.com/apollostack/react-apollo/pull/391) gets rid of warnings during redux test.

- Feature: [PR #389](https://github.com/apollostack/react-apollo/pull/389) added a shouldResubscribe option to allow subscriptions to automatically resubscribe when props change.

### v0.7.2

- Bug: fix issue where changing variables while unskipping didn't result in the variables actually changing - [Issue #374](https://github.com/apollostack/react-apollo/issues/374)

- Bug: fix issue with no longer passing errors to components w/ `apollo-client@0.5.23` - [Issue #378](https://github.com/apollostack/react-apollo/issues/378)

- Add `react-dom` to `peerDependencies` because since React 15.4 it is no longer "secretly" included.
  _(ref: https://github.com/facebook/react/releases/tag/v15.4.0)_

### v0.7.1

#### Breaking
```js
// old
import { getDataFromTree, renderToStringWithData } from 'react-apollo/server'

// new
import { getDataFromTree, renderToStringWithData } from 'react-apollo'
```

- Feature: Better packaging [PR #306](https://github.com/apollostack/react-apollo/pull/306)
- Feature: Add networkStatus prop to connected components[Issue #322](https://github.com/apollostack/react-apollo/issues/322)
- Feature: Pass component display name as watchQuery metadata for experimental devtools [PR #363](https://github.com/apollostack/react-apollo/pull/363)
- Feature: Removed use of `createFragment` and bumped AC version [PR #357](https://github.com/apollostack/react-apollo/pull/357)
- Bug: fix issue with Redux's `connect` and SSR - [Issue #350](https://github.com/apollostack/react-apollo/issues/350)

### v0.6.0

#### Breaking
```js
// old -- we attempted to get the state out of your apollo provider for your
renderToStringWithData(component).then({ markup, initialState })

// new -- you must get it yourself
renderToStringWithData(component).then(markup => {
  const initialState = client.store.getState()[client.reduxRootKey];

  // ...
});

```

This release refactors the server side rendering and data access code, hopefully making it easier to contribute to in the future and fixing a few bugs along the way:

- Bug: Fix bug in SSR in React Production mode [Issue #237](https://github.com/apollostack/react-apollo/issues/237)
- Bug: Fix issue fetching multiple levels of queries [Issue #250](https://github.com/apollostack/react-apollo/issues/250)
- Bug: Fix issue with Stateless components in SSR [Issue #297](https://github.com/apollostack/react-apollo/issues/297)
- Feature: Refactored to collect data in one place [Issue 264](https://github.com/apollostack/react-apollo/issues/264)

### v0.5.15
- Feature: Added test utilities and examples to library.

### v0.5.14

- Bug: Fix issue with usage in TypeScript projects caused by 'compose' re-export. [PR #291](https://github.com/apollostack/react-apollo/pull/291)
- Bug: Fix issue with forceFetch during SSR [PR #293](https://github.com/apollostack/react-apollo/pull/293)

### v0.5.12

- Full support for both Apollo Client 0.4.21 and 0.5.0. [PR #277](https://github.com/apollostack/react-apollo/pull/277)

### v0.5.11

- Bug: Fix issue with SSR queries running twice when a mutation wraps a query [#274](https://github.com/apollostack/react-apollo/issue/274)

### v0.5.10

- Bug: Fix issue with changing outer props *and not changing variables*, ultimately caused by https://github.com/apollostack/apollo-client/pull/694

### v0.5.9

- Bug: Fix and test some subtle bugs around skipping and subscriptions. [#260](https://github.com/apollostack/react-apollo/pull/260)

### v0.5.8

- Feature: Remove nested imports for apollo-client. Making local development eaiser. [#234](https://github.com/apollostack/react-apollo/pull/234)
- Feature: Move types to dev deps [#251](https://github.com/apollostack/react-apollo/pull/251)
- Feature: New method for skipping queries which bypasses HOC internals [#253](https://github.com/apollostack/react-apollo/pull/253)
- Feature: Integrated subscriptions! [#256](https://github.com/apollostack/react-apollo/pull/256)
- Feature: Refactor loading state managment to use apollo-client fully. Reduces library size by ~50% [#211](https://github.com/apollostack/react-apollo/pull/211)

### v0.5.7

 - Feature: Upgraded to typescript 2.0 [#217](https://github.com/apollostack/react-apollo/pull/217)
 - Feature: Allow usage of redux key or selector [#226](https://github.com/apollostack/react-apollo/pull/226)

### v0.5.6

- Bug: Passing immutable to ApolloProvider breaks ssr. `renderToStringWithData` fails to reference the right store.
 [#222](https://github.com/apollostack/react-apollo/pull/222)
 - Bug: Fixed issue with context in SSR [#218](https://github.com/apollostack/react-apollo/issues/218)

### v0.5.5

- Bug: Fixed lifecycle events for componentWillMount() on the server [#205](https://github.com/apollostack/react-apollo/pull/205)

### v0.5.4

- Bug: Created better reference to updateQuery when bound early. It will also throw if called before it should be.

### v0.5.3

- Bug: Fixed issue with updateQuery not being present during componentWillMount [#203](https://github.com/apollostack/react-apollo/pull/203)

### v0.5.2

- Feature: Allow optional variables by passing null value on behalf of the variable [#200](https://github.com/apollostack/react-apollo/pull/200)

### v0.5.1

- Feature: Added link to [recompose](https://github.com/acdlite/recompose) to use the `compose` function. This makes it easy to combine multiple queries on a single component. [#194](https://github.com/apollostack/react-apollo/pull/194)

### v0.5.0

#### Breaking
```js
// old
renderToStringWithData(component).then(markup) // markup had a script tag

// new

renderToStringWithData(component).then({ markup, initialState }) // markup has not tag, and state is passed
```

- Feature: Removed client as a prop and fixed warnings when not using ApolloProvider [#189](https://github.com/apollostack/react-apollo/pull/189)
- Feature: Added updateQuery to data props

- Bug: Fixed renderToStringWithData causing react warning [#169](https://github.com/apollostack/react-apollo/issues/169)
- Bug: Fixed ssr fragment issue [#178](https://github.com/apollostack/react-apollo/pull/178)
- Bug: Fixed loading state for skipped queries [#190](https://github.com/apollostack/react-apollo/pull/190)
- Bug: Fixed loading state on remounted component with different variables


### v0.4.7

- Bug: Fixed SSR issue with context [#165](https://github.com/apollostack/react-apollo/pull/165)
- Bug: Fixed issue when context changes in parent container not going through to child; [#162](https://github.com/apollostack/react-apollo/pull/162)
- Bug: Fixed loading state on remount of forceFetch operations; [#161](https://github.com/apollostack/react-apollo/pull/161)

### v0.4.6

- Bug: Fixed issue with variable merging after fetchMore [#150](https://github.com/apollostack/react-apollo/pull/150)

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
