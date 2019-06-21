# Change log

## 3.0.0 (Not yet released)

### Breaking Changes

- The minimum supported React version is now 16.8.

- The `react-apollo@3` package preserves most of the functionality of `react-apollo@2` by re-exporting existing components and functions from `@apollo/react-components` and `@apollo/react-hoc`. If you want to use Hooks, Components, or HOC directly, import the new `@apollo/react-hooks`, `@apollo/react-components`, and/or `@apollo/react-hoc` packages instead.

- React Apollo testing utilities are no longer available as part of the `react-apollo` package. They should now be imported from the new `@apollo/react-testing` package.

- The deprecated `walkTree` function has been removed ([9b24d756](https://github.com/apollographql/react-apollo/pull/2892/commits/9b24d7567be194c454395365bb5db4fbd7a5caca)).

- The deprecated `GraphqlQueryControls` and `MutationFunc` types have been removed ([ade881f0](https://github.com/apollographql/react-apollo/pull/2892/commits/ade881f07b1175d28b0aae79915bfc5ed8dd9e5a)).

- Preact is no longer supported ([b742ae63](https://github.com/apollographql/react-apollo/pull/2892/commits/b742ae6382039eac79e050a9b0f54183dafaf4a3)).

- Various Typescript type changes. Since we've introduced a third way of
  managing data with React (Hooks), we had to rework many of the existing
  exported types to better align with the Hooks way of doing things. Base types
  are used to hold common properties across Hooks, Components and the `graphql`
  HOC, and these types are then extended when needed to provide properties
  that are specific to a certain React paradigm
  ([30edb1b0](https://github.com/apollographql/react-apollo/pull/2892/commits/30edb1b080b64253b9074a5e7347c544618ea2ea) and
  [3d138db3](https://github.com/apollographql/react-apollo/pull/2892/commits/3d138db386fe44e35203b991eb6caca0eec19d3d)).

- `catchAsyncError`, `wrap`, and `compose` utilities have been removed
  ([2c3a262](https://github.com/apollographql/react-apollo/pull/2892/commits/2c3a262f9eb1cfb9e58b40ceaeda16a628e3964c), [7de864e](https://github.com/apollographql/react-apollo/pull/2892/commits/7de864ecb90521fc2e1f211023fe436486af2324), and [e6089a7](https://github.com/apollographql/react-apollo/pull/2892/commits/e6089a716b2b19b57f36200db378b8613a91612d))

### Improvements

- `useApolloClient` can be used to return an `ApolloClient` instance from
  React Apollo's context, assuming it was previously set using
  `ApolloProvider`. <br/>
  [@FredyC](https://github.com/FredyC) in [#2872](https://github.com/apollographql/react-apollo/pull/2872)

## 2.5.7 (2019-06-21)

### Improvements

- Make sure `MockedProvider` is using the proper CJS/ESM bundle, when
  referencing `ApolloProvider`. <br/>
  [@jure](https://github.com/jure) in [#3029](https://github.com/apollographql/react-apollo/pull/3029).
- Adjust the `ApolloContext` definition to play a bit more nicely with
  `React.createContext` types. <br/>
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#3018](https://github.com/apollographql/react-apollo/pull/3018)
- The result of a mutation is now made available to the wrapped component,
  when using the `graphql` HOC. <br/>
  [@andycarrell](https://github.com/andycarrell) in [#3008](https://github.com/apollographql/react-apollo/pull/3008)
- Check equality of stringified variables in the `MockLink` to improve
  debugging experience used by `MockedProvider`. <br/>
  [@evans](https://github.com/evans) in [#3078](https://github.com/apollographql/react-apollo/pull/3078)

### Bug Fixes

- Removed leftover `apollo-client@beta` peer dep. <br/>
  [@brentertz](https://github.com/brentertz) in [#3064](https://github.com/apollographql/react-apollo/pull/3064)
- Stop setting optional input to `null`, when using the `graphql` HOC. <br/>
  [@ZhengYuTay](https://github.com/ZhengYuTay) in [#3056](https://github.com/apollographql/react-apollo/pull/3056)
- Fix typescript error caused by `query` being mandatory in the `fetchMore` signature. <br/>
  [@HsuTing](https://github.com/HsuTing) in [#3065](https://github.com/apollographql/react-apollo/pull/3065)
- Fixes an issue that caused the `Query` component to get stuck in an always
  loading state, caused by receiving an error (meaning subsequent valid
  responses couldn't be handled). The `Query` component can now handle an
  error in a response, then continue to handle a valid response afterwards. <br/>
  [@hwillson](https://github.com/hwillson) in [#3107](https://github.com/apollographql/react-apollo/pull/3107)
- Reorder `Subscription` component code to avoid setting state on unmounted
  component. <br/>
  [@jasonpaulos](https://github.com/jasonpaulos) in [#3139](https://github.com/apollographql/react-apollo/pull/3139)
- Fix component stuck in `loading` state for `network-only` fetch policy. <br/>
  [@jasonpaulos](https://github.com/jasonpaulos) in [#3126](https://github.com/apollographql/react-apollo/pull/3126)

## 2.5.6 (2019-05-22)

### Improvements

- Both the `Query` component and `graphql` HOC now accept a
  `returnPartialData` prop. This is an important new feature, that should
  help address a lot of open Apollo Client / React Apollo issues, so we'll
  explain it here with an example. Before this release, if you run a query
  that looks like:

  ```js
  const GET_MEMBER = gql`
    query GetMember($id: ID!) {
      member(id: $id) {
        id
        name
      }
    }
  `;
  ```

  in one component, the results are cached, then you run a superset query like
  the following in another component:

  ```js
  const GET_MEMBER_WITH_PLANS = gql`
    query GetMemberWithPlans($id: ID!) {
      member(id: $id) {
        id
        name
        plans {
          id
          title
          duration
        }
      }
    }
  `;
  ```

  Apollo Client will not re-use the partial data that was cached from the first
  query, when it preps and displays the second component. It can't find a
  cache hit for the full second query, so it fires the full query over the
  network.

  With this release, if you set a `returnPartialData` prop to `true` on the
  second component, the `data` available to that component will be
  automatically pre-loaded with the parts of the query that can be found in the
  cache, before the full query is fired over the network. This means you can
  do things like showing partial data in your components, while the rest of the
  data is being loaded over the network.

## 2.5.5 (2019-04-22)

### Improvements

- Export the Apollo Context provider (`ApolloContext`). <br/>
  [@MrLoh](https://github.com/MrLoh) in [#2961](https://github.com/apollographql/react-apollo/pull/2961)

## 2.5.4 (2019-04-05)

### Bug Fixes

- Fixes `Could not find "client" in the context of ApolloConsumer` errors when
  using `MockedProvider`. <br/>
  [@hwillson](https://github.com/hwillson) in [#2907](https://github.com/apollographql/react-apollo/pull/2907)
- Ensure `Query` components using a `fetchPolicy` of `no-cache` have their
  data preserved when the components tree is re-rendered. <br/>
  [@hwillson](https://github.com/hwillson) in [#2914](https://github.com/apollographql/react-apollo/pull/2914)

### Improvements

- Documentation updates. <br/>
  [@afenton90](https://github.com/afenton90) in [#2932](https://github.com/apollographql/react-apollo/pull/2932)

## 2.5.3

### Bug Fixes

- Fixed an infinite loop caused by using `setState` in the
  `onError` / `onCompleted` callbacks of the `Query` component. <br/>
  [@chenesan](https://github.com/chenesan) in [#2751](https://github.com/apollographql/react-apollo/pull/2751)
- Fixed an issue that prevented good results from showing up in a `Query`
  component, after an error was received, variables were adjusted, and then
  the good data was fetched. <br/>
  [@MerzDaniel](https://github.com/MerzDaniel) in [#2718](https://github.com/apollographql/react-apollo/pull/2718)
- Fixed an issue that prevented `Query` component updates from firing (under
  certain circumstances) due to the internal `lastResult` value (that's used
  to help prevent unnecessary re-renders) not being updated. <br/>
  [@Glennrs](https://github.com/Glennrs) in [#2840](https://github.com/apollographql/react-apollo/pull/2840)

### Improvements

- `MockedProvider` now accepts a `childProps` prop that can be used to pass
  props down to a child component. <br/>
  [@miachenmtl](https://github.com/miachenmtl) in [#2482](https://github.com/apollographql/react-apollo/pull/2482)
- `onCompleted` callbacks now use a destructuring-friendly type definition. <br/>
  [@jozanza](https://github.com/jozanza) in [#2496](https://github.com/apollographql/react-apollo/pull/2496)
- `@connection` directives are now properly stripped from `MockedResponse`'s,
  when using `MockedProvider`. <br/>
  [@ajmath](https://github.com/ajmath) in [#2523](https://github.com/apollographql/react-apollo/pull/2523)
- `MockedProvider` has been updated to stop setting a default `resolvers`
  value of `{}`, which means by default Apollo Client 2.5 local resolver
  functionality is not enabled when mocking with `MockedProvider`. This allows
  `@client` fields to be passed through the mocked link chain, like people
  were used to before AC 2.5. When using this default mode you will see a
  dev only warning message about this like:

  > Found @client directives in query but no client resolvers were specified.
  > You can now pass apollo-link-state resolvers to the ApolloClient
  > constructor.

  This message can be safely ignored. If you want to use `MockedProvider`
  with AC 2.5's new local resolver functionality, you can pass your local
  resolver map into the `MockedProvider` `resolvers` prop. <br/>
  [@ajmath](https://github.com/ajmath) in [#2524](https://github.com/apollographql/react-apollo/pull/2524)

- Improvements to the `graphql` HOC generics for `fetchMore` and `refetch`. <br/>
  [@EricMcRay](https://github.com/EricMcRay) in [#2525](https://github.com/apollographql/react-apollo/pull/2525)
- The `ApolloProvider` / `ApolloConsumer` implementations have been refactored
  to use [React 16.3's new context API](https://reactjs.org/docs/context.html). <br/>
  [@wzrdzl](https://github.com/wzrdzl) in [#2540](https://github.com/apollographql/react-apollo/pull/2540)
- All `dependencies` and `devDependencies` have been updated to their latest
  versions, and related Typescript changes have been applied. <br/>
  [@hwillson](https://github.com/hwillson) in [#2873](https://github.com/apollographql/react-apollo/pull/2873)

## v2.5.2

### Bug Fixes

- Export `Context` type from `types.ts` instead of `walkTree.ts`,
  to reenable `import { Context } from 'react-apollo'` (which has been
  broken since 2.4.0). <br/>
  [@benjamn](https://github.com/benjamn) in [#2825](https://github.com/apollographql/react-apollo/pull/2832)

### Improvements

- Add [`examples/rollup`](https://github.com/apollographql/react-apollo/tree/master/examples/rollup)
  to enable application-level bundle measurement and demonstrate Rollup configuration best practices. <br/>
  [@benjamn](https://github.com/benjamn) in [#2839](https://github.com/apollographql/react-apollo/pull/2839)

- Bundle size reductions inspired by `examples/rollup` app. <br/>
  [@benjamn](https://github.com/benjamn) in [#2842](https://github.com/apollographql/react-apollo/pull/2842)

## 2.5.1

### Bug Fixes

- Make sure `MockedProvider` enables Apollo Client 2.5's local state handling,
  and allow custom / mocked resolvers to be passed in as props, and used with
  the created test `ApolloClient` instance. <br/>
  [@hwillson](https://github.com/hwillson) in [#2825](https://github.com/apollographql/react-apollo/pull/2825)

## 2.5.0

### Improvements

- Ready to be used with Apollo Client 2.5 and its new local state management
  features, as well as many overall code improvements to help reduce the React
  Apollo bundle size. <br/>
  [#2758](https://github.com/apollographql/react-apollo/pull/2758)
- A function can now be set as a `MockedResponse` `result` when using
  `MockedProvider`, such that every time the mocked result is returned,
  the function is run to calculate the result. This opens up new testing
  possibilities, like being able to verify if a mocked result was actually
  requested and received by a test. <br/>
  [@hwillson](https://github.com/hwillson) in [#2788](https://github.com/apollographql/react-apollo/pull/2788)

## 2.4.1

### Improvements

- Adds a `onSubscriptionComplete` prop to the `Subscription` component, that
  can be passed a callback to be called when the subscription observable
  is completed. <br/>
  [@sujeetsr](https://github.com/sujeetsr) in [#2716](https://github.com/apollographql/react-apollo/pull/2716)

- During server-side rendering, `ObservableQuery` objects created in
  previous rendering passes will now be preserved in later passes (within
  the same `getDataFromTree` or `getMarkupFromTree` call), so that errors
  can be handled properly when using the `errorPolicy: "all"` option. <br/>
  [PR #2753](https://github.com/apollographql/react-apollo/pull/2753)

## 2.4.0

### Bug Fixes

- Invoke `onCompleted`/`onError` even if `Mutation` unmounts. <br/>
  [PR #2710](https://github.com/apollographql/react-apollo/pull/2710)

### Improvements

- The `walkTree` function has been deprecated, since there's no way to
  make its behavior consistent with the latest versions of React. To save
  bundle size, `walkTree` is no longer exported from `react-apollo`,
  though you can still access it as follows:
  ```js
  import { walkTree } from 'react-apollo/walkTree';
  ```

## 2.4.0

### Bug Fixes

- Invoke `onCompleted`/`onError` even if `Mutation` unmounts. <br/>
  [PR #2710](https://github.com/apollographql/react-apollo/pull/2710)

### Improvements

- Update the typescript example app to use the raw Query component directly,
  with generics, to avoid generating the extra object that's created (in the
  compiled code) when extending the Query component as a class. <br/>
  [@evans](https://github.com/evans) in [#2721](https://github.com/apollographql/react-apollo/pull/2721)

- Use new `ApolloClient#stop` method to dispose of `MockedProvider` client
  instance. <br/>
  [PR #2741](https://github.com/apollographql/react-apollo/pull/2741)

- The `apollo-client` peer dependency version constraint has been updated
  to require the latest version, 2.4.12. Although this update is
  recommended, and we believe it is backwards compatible with other
  apollo-client@2.4.x versions, we decided to bump the minor version of
  `react-apollo` (to 2.4.0) because of this new `apollo-client` version
  requirement.

## 2.3.3

### Bug Fixes

- Add `react-dom` as a peer dependency (since it's used by `getDataFromTree`
  and `renderToStringWithData`). <br/>
  [@hwillson](https://github.com/hwillson) in [#2660](https://github.com/apollographql/react-apollo/pull/2660)

### Improvements

- Drop `react` 14.x support, since the 14.x release line is 2 years old now,
  and `react-apollo` is no longer tested against it. <br/>
  [@hwillson](https://github.com/hwillson) in [#2660](https://github.com/apollographql/react-apollo/pull/2660)

## 2.3.2

### Improvements

### Bug Fixes

- This package no longer imports `react-dom/server` unconditionally at the
  top level, making `react-apollo` safer to use in environments like React
  Native that are neither browser-like nor Node-like, and thus struggle to
  import `react-dom/server` and its dependencies. Additionally, the React
  Native bundler has been instructed to ignore all `react-dom/server`
  dependencies within `react-apollo`, so `react-dom` will not be bundled
  in React Native apps simply because they import `react-apollo`.
  [PR #2627](https://github.com/apollographql/react-apollo/pull/2627)

## 2.3.1 (November 15, 2018)

### Improvements

- Restore original `getDataFromTree(tree, context)` API, and introduce a
  new alternative called `getMarkupFromTree` to enable custom rendering
  functions:

  ```typescript
  export default function getDataFromTree(
    tree: React.ReactNode,
    context: { [key: string]: any } = {},
  ) {
    return getMarkupFromTree({
      tree,
      context,
      renderFunction: renderToStaticMarkup,
    });
  }

  export type GetMarkupFromTreeOptions = {
    tree: React.ReactNode;
    context?: { [key: string]: any };
    renderFunction?: typeof renderToStaticMarkup;
  };

  export function getMarkupFromTree({
    tree,
    context = {},
    renderFunction = renderToStaticMarkup,
  }: GetMarkupFromTreeOptions): Promise<string> {...}
  ```

  [PR #2586](https://github.com/apollographql/react-apollo/pull/2586)

### Bug Fixes

- Version 2.3.0 was published incorrectly, breaking nested
  `react-apollo/...` imports. This problem was fixed in version 2.3.1 by
  running `npm publish` from the `lib/` directory, as intended.
  [Issue #2591](https://github.com/apollographql/react-apollo/issues/2591)

## 2.3.0

### Bug Fixes

- Fix `networkStatus` to reflect the loading state correctly for partial
  refetching. <br/>
  [@steelbrain](https://github.com/steelbrain) in [#2493](https://github.com/apollographql/react-apollo/pull/2493)

### Improvements

- Reimplement `getDataFromTree` using `ReactDOM.renderToStaticMarkup` to
  make asynchronous server-side rendering compatible with
  [React hooks](https://reactjs.org/docs/hooks-intro.html).
  Although the rendering function used by `getDataFromTree` defaults to
  `renderToStaticMarkup`, any suitable rendering function can be passed as
  the optional second argument to `getDataFromTree`, which now returns a
  `Promise<string>` that resolves to The HTML rendered in the final pass,
  which means calling `renderToString` after `getDataFromTree` may not be
  necessary anymore.
  [PR #2533](https://github.com/apollographql/react-apollo/pull/2533)

## 2.2.4 (October 2, 2018)

### Bug Fixes

- `lodash.isequal` was improperly set as a dev dependency for
  `MockLink` / `MockedProvider`. It is now a dependency. <br/>
  [@danilobuerger](https://github.com/danilobuerger) in [#2449](https://github.com/apollographql/react-apollo/pull/2449)

### Improvements

- The `Subscription` component now accepts a `fetchPolicy` prop. <br/>
  [@MatthieuLemoine](https://github.com/MatthieuLemoine) in [#2298](https://github.com/apollographql/react-apollo/pull/2298)

### Typescript

- Make sure the `TVariables` generic is passed to `ObservableQuery`. <br/>
  [@tgriesser](https://github.com/tgriesser) in [#2311](https://github.com/apollographql/react-apollo/pull/2311)

## 2.2.3 (September 30, 2018)

### Bug Fixes

- Mutation errors are now properly returned as a render prop, when using
  a default `errorPolicy` of `all`. <br/>
  [@amacleay](https://github.com/amacleay) in [#2374](https://github.com/apollographql/react-apollo/pull/2374)
- `<Mutation />` `refetchQueries` triggered by name (string) will now use the correct variables. <br/>
  [@fracmal](https://github.com/fracmak) in [#2422](https://github.com/apollographql/react-apollo/pull/2422)

### Improvements

- Replace the `lodash` dependency with `lodash.flowright` (since that's the
  only non-dev `lodash` function we're dependent on). Dev `lodash`
  dependencies have also been updated to use their individual module
  equivalent. <br/>
  [@hwillson](https://github.com/hwillson) in [#2435](https://github.com/apollographql/react-apollo/pull/2435)
- Removed `rollup-plugin-babel-minify` as it's no longer being used. <br/>
  [@hwillson](https://github.com/hwillson) in [#2436](https://github.com/apollographql/react-apollo/pull/2436)
- Small `getDataFromTree.ts` logic adjustment to avoid unnecessary calls
  when a falsy `element` is encountered. <br/>
  [@HOUCe](https://github.com/HOUCe) in [#2429](https://github.com/apollographql/react-apollo/pull/2429)
- `graphql` 14 updates. <br/>
  [@hwillson](https://github.com/hwillson) in [#2437](https://github.com/apollographql/react-apollo/pull/2437)
- All example apps (included in the repo) have been updated to work with the
  latest version of React Apollo. <br/>
  [@hwillson](https://github.com/hwillson) in [#2439](https://github.com/apollographql/react-apollo/pull/2439)

### Typescript

- Fix `lodash` typings. <br/>
  [@williamboman](https://github.com/williamboman) in [#2430](https://github.com/apollographql/react-apollo/pull/2430)
- Typings: added `context` to `MutationOptions`. <br/>
  [@danilobuerger](https://github.com/danilobuerger) in [#2354](https://github.com/apollographql/react-apollo/pull/2354)
- Typings: more `MutationOptions` changes/fixes. <br/>
  [@danilobuerger](https://github.com/danilobuerger) in [#2340](https://github.com/apollographql/react-apollo/pul/2340)
- Remove `allowSyntheticDefaultImports` use. Typescript's
  `allowSyntheticDefaultImports` compiler option is something we'd like to
  start using, but we jumped the gun a bit by introducing it in
  https://github.com/apollographql/react-apollo/commit/9a96519d390783dfd9a431dc2dbaa476a24f7b80.
  Including it means that anyone who wants to use Typescript with React
  Apollo would have to also include it in their own local `tsconfig.json`, to
  be able to handle default imports properly. This is because we're also using
  Typescript's `es2015` `module` option, which means
  `allowSyntheticDefaultImports` has to be enabled explicitly. We've
  switched back to using a combination of `import * as X` and `require`
  syntax, to work with default imports. We'll re-introduce
  `allowSyntheticDefaultImports` use in React Apollo 3. <br/>
  [@hwillson](https://github.com/hwillson) in [#2438](https://github.com/apollographql/react-apollo/pull/2438)

## 2.2.2 (September 28, 2018)

- When using `React.createContext` and SSR, we now make sure the context
  provider value is reset to the previous value it had after its children are
  walked. <br/>
  [@mitchellhamilton](https://github.com/mitchellhamilton) in [#2304](https://github.com/apollographql/react-apollo/pull/2304)
- Revert: <br/>
  When a query failed on the first result, the query result `data` was being
  returned as `undefined`. This behavior has been changed so that `data` is
  returned as an empty object. This makes checking for data (e.g.
  instead of `data && data.user` you can just check `data.user`) and
  destructring (e.g. `{ data: { user } }`) easier. **Note:** this could
  potentially hurt applications that are relying on a falsey check of `data`
  to see if any query errors have occurred. A better (and supported) way to
  check for errors is to use the result `errors` property. <br/>
  [#1983](https://github.com/apollographql/react-apollo/pull/1983)

## 2.2.1 (September 26, 2018)

- Revert: "Typescript: use `Partial<TData>` instead of `TData | {}`, for the
  `QueryResult` `data` property."

## 2.2.0 (September 26, 2018)

- Improved TypeScript Typings:
  Deprecated `MutationFunc` in favor of `MutationFn`.
  Added missing `onCompleted` and `onError` callbacks to `MutationOpts`. <br/>
  [@danilobuerger](https://github.com/danilobuerger) in [#2322](https://github.com/apollographql/react-apollo/pull/2322)
- Added an example app that shows how to test mutations. <br/>
  [@excitement-engineer](https://github.com/excitement-engineer) in [#1998](https://github.com/apollographql/react-apollo/pull/1998)
- The `<Subscription />` component now allows the registration of a callback
  function, that will be triggered each time the component receives data. The
  callback `options` object param consists of the current Apollo Client
  instance in `client`, and the received subscription data in
  `subscriptionData`. <br/>
  [@jedwards1211](https://github.com/jedwards1211) in [#1966](https://github.com/apollographql/react-apollo/pull/1966)
- The `graphql` `options` object is no longer mutated, when calculating
  variables from props. This now prevents an issue where components created
  with `graphql` were not having their query variables updated properly, when
  props changed. <br/>
  [@ksmth](https://github.com/ksmth) in [#1968](https://github.com/apollographql/react-apollo/pull/1968)
- When a query failed on the first result, the query result `data` was being
  returned as `undefined`. This behavior has been changed so that `data` is
  returned as an empty object. This makes checking for data (e.g.
  instead of `data && data.user` you can just check `data.user`) and
  destructring (e.g. `{ data: { user } }`) easier. **Note:** this could
  potentially hurt applications that are relying on a falsey check of `data`
  to see if any query errors have occurred. A better (and supported) way to
  check for errors is to use the result `errors` property. <br/>
  [@TLadd](https://github.com/TLadd) in [#1983](https://github.com/apollographql/react-apollo/pull/1983)
- Allow a custom `cache` object to be passed into the test-utils
  `MockedProvider`. <br/>
  [@palmfjord](https://github.com/palmfjord) in [#2254](https://github.com/apollographql/react-apollo/pull/2254)
- Make the `MockedProvider` `mocks` prop read only. <br/>
  [@amacleay](https://github.com/amacleay) in [#2284](https://github.com/apollographql/react-apollo/pull/2284)
- Remove duplicate `FetchMoreOptions` and `FetchMoreQueryOptions` types, and
  instead import them from Apollo Client. <br/>
  [@skovy](https://github.com/skovy) in [#2281](https://github.com/apollographql/react-apollo/pull/2281)
- Type changes for the `graphql` HOC `options.skip` property. <br/>
  [@jameslaneconkling](https://github.com/jameslaneconkling) in [#2208](https://github.com/apollographql/react-apollo/pull/2208)
- Avoid importing `lodash` directly. <br/>
  [@shahyar](https://github.com/shahyar) in [#2045](https://github.com/apollographql/react-apollo/pull/2045)
- When the `Query` `skip` prop is set to `true`, make sure the render prop
  `loading` param is set to `false`, since we're not actually loading
  anything. <br/>
  [@edorivai](https://github.com/edorivai) in [#1916](https://github.com/apollographql/react-apollo/pull/1916)
- No longer building against Node 9 <br/>
  [@hwillson](https://github.com/hwillson) in [#2404](https://github.com/apollographql/react-apollo/pull/2404)
- Make sure `<Subscription />`, `<Query />` & `<Mutation />` all support
  using an Apollo Client instance configured in the `context` or via
  props. <br/>
  [@quentin-](https://github.com/quentin-) in [#1956](https://github.com/apollographql/react-apollo/pull/1956)
- Typescript: use `Partial<TData>` instead of `TData | {}`, for the
  `QueryResult` `data` property. <br/>
  [@tgriesser](https://github.com/tgriesser) in [#2313](https://github.com/apollographql/react-apollo/pull/2313)
- Adjust `<Query />` `onCompleted` and `onError` callbacks to be triggered
  via the `componentDidUpdate` lifecycle method. This ensures these callbacks
  can be used when data is fetched over the network, and when data is
  fetched from the local store (previsouly these callbacks were only being
  triggered when data was fetched over the network).
  [@olistic](https://github.com/olistic) in [#2190](https://github.com/apollographql/react-apollo/pull/2190)
- Import `lodash/flowRight` using ES import to allow for treeshaking. <br/>
  [@Pajn](https://github.com/Pajn) in [#2332](https://github.com/apollographql/react-apollo/pull/2332)
- Fixed a regression where `variables` passed in `graphql` HOC `options` were
  not merged with mutation `variables`. <br/>
  [@samginn](https://github.com/samginn) in [#2216](https://github.com/apollographql/react-apollo/pull/2216)
- Added a new `partialRefetch` prop (`false` by default).
  When a `Query` component is mounted, and a mutation is executed
  that returns the same ID as the mounted `Query`, but has less
  fields in its result, Apollo Client's `QueryManager` returns the
  data as an empty Object since a hit can't be found in the cache.
  This can lead to application errors when the UI elements rendered by
  the original `Query` component are expecting certain data values to
  exist, and they're all of a sudden stripped away. The recommended way to
  handle this is to use the mutations `update` prop to reconcile the mutation
  result with the data in the cache, getting everything into the expected
  state. This can definitely be a cumbersome process however, so to help
  address this the `partialRefetch` prop can be used to automatically
  `refetch` the original query and update the cache. <br/>
  [@steelbrain](https://github.com/steelbrain) in [#2003](https://github.com/apollographql/react-apollo/pull/2003)

## 2.1.11 (August 9, 2018)

- Fixed an issue in `getDataFromTree` where queries that threw more than one
  error had error messages swallowed, and returned an invalid error object
  with circular references. Multiple errors are now preserved. <br/>
  [@anand-sundaram-zocdoc](https://github.com/anand-sundaram-zocdoc) in [#2133](https://github.com/apollographql/react-apollo/pull/2133)
- Update both the `<Mutation />` component and `graphql` HOC to accept a new
  `awaitRefetchQueries` prop (boolean). When set to `true`, queries specified
  in `refetchQueries` will be completed before the mutation itself is
  completed. `awaitRefetchQueries` is `false` by default, which means
  `refetchQueries` are usually completed after the mutation has resolved.
  Relates to Apollo Client. <br/>
  [PR #3169](https://github.com/apollographql/apollo-client/pull/3169). <br/>
  [@hwillson](https://github.com/hwillson) in [#2214](https://github.com/apollographql/react-apollo/pull/2214)
- Typings adjustment: pass `TData` along into `MutationUpdaterFn` when using
  `MutationOpts`, to ensure that the updater function is properly typed. <br/>
  [@danilobuerger](https://github.com/danilobuerger) in [#2227](https://github.com/apollographql/react-apollo/pull/2227)
- Check if queryManager is set before accessing it. <br/>
  [@danilobuerger](https://github.com/danilobuerger) in [#2165](https://github.com/apollographql/react-apollo/pull/2165)

## 2.1.9 (July 4, 2018)

- Added `onCompleted` and `onError` props to the `Query` component, than can
  be used to register callback functions that are to be executed after a
  query successfully completes, or an error occurs.
  [@jeshep](https://github.com/jeshep) in [#1922](https://github.com/apollographql/react-apollo/pull/1922)
- Add `UNSAFE_componentWillMount` SSR support.
  [@leops](https://github.com/leops) in [#2152](https://github.com/apollographql/react-apollo/pull/2152)
- Clear out scheduler on MockedProvider unmount.
  [@danilobuerger](https://github.com/danilobuerger) in [#2151](https://github.com/apollographql/react-apollo/pull/2151)

## 2.1.8 (June 28, 2018)

- Addressed deployment issue.

## 2.1.7 (June 27, 2018)

- The `ApolloProvider` `children` prop type has been changed from `element`
  to `node`, to allow multiple children.
  [@quentin-](https://github.com/quentin-) in [#1955](https://github.com/apollographql/react-apollo/pull/1955)
- Properly support the new `getDerivedStateFromProps` lifecycle method.
  [@amannn](https://github.com/amannn) in [#2076](https://github.com/apollographql/react-apollo/pull/2076)
- `lodash` is no longer pinned to version 4.17.10.
  [@cherewaty](https://github.com/cherewaty) in [#1951](https://github.com/apollographql/react-apollo/pull/1951)
- README updates to replace `apollo-client-preset` with `apollo-boost`.
  [@JamesTheHacker](https://github.com/JamesTheHacker) in [#1925](https://github.com/apollographql/react-apollo/pull/1925)
- README updates to fix broken links.
  [@DennisKo](https://github.com/DennisKo) in [#1935](https://github.com/apollographql/react-apollo/pull/1935)
- Project README has been updated to show a `<Query />` example.
  [@petetnt](https://github.com/petetnt) in [#2102](https://github.com/apollographql/react-apollo/pull/2102)

## 2.1.6 (June 19, 2018)

- Adjust `getDataFromTree` to properly traverse React 16.3's context API
  provider/consumer approach.
  [@marnusw](https://github.com/marnusw) in [#1978](https://github.com/apollographql/react-apollo/pull/1978)
- An `ApolloClient` instance can now be passed into a `Mutation`
  component via a prop named `client`. This prop will override
  an `ApolloClient` instance set via `context`, by the `ApolloProvider`
  component.
  [@amneacsu](https://github.com/amneacsu) in [#1890](https://github.com/apollographql/react-apollo/pull/1890)
- The `ApolloClient` instance used by a Mutation is now available in that
  Mutation's result.
  [PR #1945](https://github.com/apollographql/react-apollo/pull/1945)
  [@cooperka](https://github.com/cooperka) in [#1945](https://github.com/apollographql/react-apollo/pull/1945)

## 2.1.5

- Dependency updates to align with typescript changes made in
  `apollo-client` 2.3.3
  [PR #2105](https://github.com/apollographql/react-apollo/pull/2105)

## 2.1.4

- Adds `__typename` for queries made with MockProvider and MockLink

## 2.1.3

- Fixed issue where refetch was not possible after SSR
- Fixed overly resubscribing from Subscription and allow passing function to determine shouldResubscribe

## 2.1.2

- Simplified the MockedProvider API [#1882](https://github.com/apollographql/react-apollo/pull/1882)
- Fixed test-utils export

## 2.1.1

- Fix uneccesary rerender on cache hit

## 2.1.0

- Officially release new components!

## 2.1.0-rc.5

- Turn back on TypeScript definitions

## 2.1.0-rc.4

- Fix regression on refetchQueries [#1794](https://github.com/apollographql/react-apollo/pull/1794)
- Added a new `called` prop for mutations [#1775](https://github.com/apollographql/react-apollo/pull/1775)
- Fix inconsistency in naming of subscription document prop [#1774](https://github.com/apollographql/react-apollo/pull/1774)

## 2.1.0-rc.3

- remove .mjs support

## 2.1.0-rc.2

- attempt to fix .mjs support for create react app

## 2.1.0-rc.1

- Fix default values being set as falsy in options merging
- Remove console.error call for unhandled errors for query-hoc (but keep in place for graphql hoc for backwards compat)
- Ensure context can be passed as props

### 2.1.0-rc.0

- bad build

### 2.1.0-beta.3

- Refactored and removed old `graphql` implementation in favor of new components
- Removed QueryRecycler!! :yay:
- Added `query`, `mutation`, and `subscription` higher order components
- Aded `<Subscription />` to the public API
- Added `prop-types` validation to the `<Query />`, `<Subscription />` and `<ApolloConsumer />` component [#1587](https://github.com/apollographql/react-apollo/pull/1587)
- Added `<Mutation />` component [#1520](https://github.com/apollographql/react-apollo/pull/1520)
- HoC `props` result-mapping function now receives prior return value as second argument.
- Fix errorPolicy when 'all' not passing data and errors
- Fix bundles and run test suite on all shippable code

### 2.1.0-beta.2

- Rollback importing non esm packages. Fixes the previous broken version [#1621](https://github.com/apollographql/react-apollo/pull/1621)

### 2.1.0-beta.1

- Stricter type checking in the codebase. [#1617](https://github.com/apollographql/react-apollo/pull/1617)
- Improved TS types (even more) in both `Query` component and `graphql` HoC. [#1617](https://github.com/apollographql/react-apollo/pull/1617)
- Fix React Component detection bug in `getDataFromTree` [#1604](https://github.com/apollographql/react-apollo/pull/1604)

### 2.1.0-beta.0

- Beta release of all 2.1 features!

### 2.1.0-alpha.2

- Resubscribe after error for Query [#1580](https://github.com/apollographql/react-apollo/pull/1580)
- Improved TypeScript types of Query Component [#1581](https://github.com/apollographql/react-apollo/pull/1581)

### 2.1.0-alpha.1

- Change package to produce ES2015 as `module` and commonjs for `main` [#1576](https://github.com/apollographql/react-apollo/pull/1576)
- Make `Query` component work with `getDataFromTree` by defining `fetchData` [#1579]
- Added back in support for browser / main bundles [#1578](https://github.com/apollographql/react-apollo/pull/1578)

### 2.1.0-alpha.0

- **NEW FEATURES**

  - Added `<Query />` component [#1398](https://github.com/apollographql/react-apollo/pull/1398)
  - Add `<ApolloConsumer />` component [#1399](https://github.com/apollographql/react-apollo/pull/1399) [#1484](https://github.com/apollographql/react-apollo/pull/1484)
  - Added support for Preact when using `getDataFromTree` [#1561](https://github.com/apollographql/react-apollo/pull/1561)

- **BREAKING CHANGES [Removal of deprecated code]**

  - Remove deprecated `operationOptions.options.skip`, use `operationOptions.skip` instead
  - Remove deprecated [`options.updateQueries`](https://www.apollographql.com/docs/react/basics/mutations.html#graphql-mutation-options-updateQueries), use [`options.update`](https://www.apollographql.com/docs/react/basics/mutations.html#graphql-mutation-options-update) instead [#1485](https://github.com/apollographql/react-apollo/pull/1485)

- **BREAKING CHANGES [TypeScript and Flow only]**

  - typescript - `graphql` parameterized types streamlined for
    a) full typing; and b) ease of use; and c) consistency. New parameterized is:
    `graphql<TProps,TData, TGraphQLVariables, TChildProps>` where none are required and full typing only requires the
    first three params (`TChildProps` can be derived). [#1402](https://github.com/apollographql/react-apollo/pull/1402)
  - Rename type `ProviderProps` to `ApolloProviderProps` [#1467](https://github.com/apollographql/react-apollo/pull/1467)
  - Rename `getDataFromTree` type `QueryResult` to `QueryTreeResult` [#1467](https://github.com/apollographql/react-apollo/pull/1467)
  - Rename type `QueryProps` to `GraphqlQueryControls` [#1467](https://github.com/apollographql/react-apollo/pull/1467) [#1478](https://github.com/apollographql/react-apollo/pull/1478)

- **Fixes and Improvements**
  - Fixed bug where link error prevents future requests
  - Fixed stack traces on non chrome browsers [#1568](https://github.com/apollographql/react-apollo/pull/1568)
  - Fixed bug [#1412](https://github.com/apollographql/react-apollo/issues/1412) where the `MockedProvider` ignored variables when doing matching. This is potentially breaking because tests could break for which the variables don't match [#1501](https://github.com/apollographql/react-apollo/pull/1501)
  - Update all dependencies, scripts' usage, prettier and typescript setup [#1402](https://github.com/apollographql/react-apollo/pull/1402)
  - Tests are now linted and verified valid typescript [#1402](https://github.com/apollographql/react-apollo/pull/1402)
  - Typescript - updated `types` for consistency and potential to pass through all types e.g. `TProps, TData, TGraphQLVariables` [#1402](https://github.com/apollographql/react-apollo/pull/1402)
  - Typescript - added `ChildDataProps` and `ChildMutateProps` for optional stronger typed usage version of `ChildProps` [#1402](https://github.com/apollographql/react-apollo/pull/1402)
  - Typescript - fix `graphql` HOC inference [#1402](https://github.com/apollographql/react-apollo/pull/1402)
  - Made prettier solely responsible for formatting, removed all formatting linting rules from tslint [#1452](https://github.com/apollographql/react-apollo/pull/1452)
  - Convert `Query.test` to `tsx` and parameterize types for `Query` [#1462](https://github.com/apollographql/react-apollo/pull/1462)
  - Remove copied `shallowEqual` code and delegate to `fbjs` [#1465](https://github.com/apollographql/react-apollo/pull/1465)
  - Update rollup configurations, refine package exports [#1467](https://github.com/apollographql/react-apollo/pull/1467)
  - Removed unused gzip script [#1468](https://github.com/apollographql/react-apollo/pull/1468)
  - Minify umd and ensure umd name consistency [#1469](https://github.com/apollographql/react-apollo/pull/1469)
  - Converted `test/test-utils/test-utils.test.js` to `test/test-utils.test.tsx` [#1475](https://github.com/apollographql/react-apollo/pull/1475)
  - Updates to `examples/typescript` [#1471](https://github.com/apollographql/react-apollo/pull/1471)
  - Mutation test cleanup [#1480](https://github.com/apollographql/react-apollo/pull/1480)
  - Removed react-native from the test suite [#1451](https://github.com/apollographql/react-apollo/pull/1451)
  - Add `client` to `Query`'s `QueryResult` [#1488](https://github.com/apollographql/react-apollo/pull/1488)
  - Disregard falsy elements when walking tree in SSR [#1495](https://github.com/apollographql/react-apollo/pull/1495)
  - Removed the key `variables` from the render prop result in the `<Query />` [#1497](https://github.com/apollographql/react-apollo/pull/1497)
  - Added `<Subscription />` component [#1483](https://github.com/apollographql/react-apollo/pull/1483)
  - Render callback should be typed with TData [#1519](https://github.com/apollographql/react-apollo/pull/1519)

### 2.0.4

- rolled back on the lodash-es changes from
  [#1344](https://github.com/apollographql/react-apollo/pull/1344) due to build
  errors reported on slack
  [#1393](https://github.com/apollographql/react-apollo/pull/1393)

### 2.0.3

- Use lodash-es to allow lodash functions to be used in ES modules [#1344](https://github.com/apollographql/react-apollo/pull/1344)
- turn back on flow checking

### 2.0.2

- upgraded required apollo-client for bugfix for subscriptions
- add component name in unhandled error message [#1362](https://github.com/apollographql/react-apollo/pull/1362)
- upgraded flow support to 0.59.0 :tada: [#1354](https://github.com/apollographql/react-apollo/pull/1354)
- skip null / undefined items on SSR if present [#1355](https://github.com/apollographql/react-apollo/pull/1355)

### 2.0.1

- fix skip on component update [#1330](https://github.com/apollographql/react-apollo/pull/1330)
- Correctly provide the generic cache type to ApolloProvider [#1319](https://github.com/apollographql/react-apollo/pull/1319)
- Correctly initializes component state as null (not undefined) [#1300](https://github.com/apollographql/react-apollo/pull/1310)

### 2.0.0

- BREAKING: removed cleanupApolloState as it is no longer needed!
- Exported getDataFromTree on the client
- Removed `redux` from peer dependencies. [Issue #1223](https://github.com/apollographql/react-apollo/issues/1223) [PR #1224](https://github.com/apollographql/react-apollo/pull/1224)
- Support arrays being returned from render in SSR [#1158](https://github.com/apollographql/react-apollo/pull/1158)
- Support passing an updater function to `setState` in SSR mode [#1263](https://github.com/apollographql/react-apollo/pull/1263)

### 2.0.0-beta.0

- upgrade to Apollo Client 2.0
- remove direct dependencies on Apollo Client, graphql-tag
- fix skip on component update.
- Fix: ensure `client` option can be used with mutation query [#1145](https://github.com/apollographql/react-apollo/pull/1145)
- Made `OptionProps.data`'s `TResult` partial [#1231](https://github.com/apollographql/react-apollo/pull/1231)

### 1.4.16

- upgrade to react-16
- fix shallowEqual bug.
- Added notifyOnNetworkStatusChange to QueryOpts and MutationOpts Typesccript definitions [#1034](https://github.com/apollographql/react-apollo/pull/1034)
- Added variables types with Typescript [#997](https://github.com/apollographql/react-apollo/pull/997)
- Made `ChildProps.data` non-optional [#1143](https://github.com/apollographql/react-apollo/pull/1143)

### 1.4.15

- Fix: handle calling refetch in child componentDidMount
- Fix: ensure options gets up to date props [#1025](https://github.com/apollographql/react-apollo/pull/1005)
- Fix: ensure queryRecycler exists before using it
- MockNetworkInterface match mock requests regardless of variable order [#973](https://github.com/apollographql/react-apollo/pull/973)
- Allow to pass removeTypenames to MockedProvider [#1001](https://github.com/apollographql/react-apollo/pull/1001)

### 1.4.14

- Fix: Scope query recyclers by client [#876](https://github.com/apollographql/react-apollo/pull/876)

### 1.4.13 [DEPRECATED]

- Support apollo-client 2.0

### 1.4.12

- Fix: fix issue with bad deploy

### 1.4.11 (BROKEN)

- Replace string refs with callback refs [#908](https://github.com/apollographql/react-apollo/pull/908)

### 1.4.10

- Fix: fix UMD bundle pointing to apolloClient for some reason

### 1.4.9

- Fix: fix matching types with exports for flow and ts

### 1.4.8

- Fix: Ensure typescript and flow type definitions match in name

### 1.4.7

- Feature: Add support for flow typecheck to work out of the box (without any configuration)

### 1.4.6

- Fix: Fix issue where `withRef`-option of `graphql` did not work when the query was skipped [#865](https://github.com/apollographql/react-apollo/pull/865)

### 1.4.5

- Fix: export all types from main type file

### 1.4.4

- Fix: Fix issue around hoisting non react statics for RN [#859](https://github.com/apollographql/react-apollo/pull/859)
- Fix: Fix issue where options was called even though skip was present [#859](https://github.com/apollographql/react-apollo/pull/859)
- Improvement: Allow for better typescript usage with improved types [#862](https://github.com/apollographql/react-apollo/pull/862)

### 1.4.3

- Feature: You can now supply a client in options object passed to the `graphql` high oder component. [PR #729](https://github.com/apollographql/react-apollo/pull/729)
- Fix: Fix issue when using flow definitions [PR# 787](https://github.com/apollographql/react-apollo/pull/787)
- Improvement: Reduce re-renders by using forceUpdate instead of setState({ }) [PR #775](https://github.com/apollographql/react-apollo/pull/775)
- Improvement: Refactor dataForChild to use bound function to reduce rerenders [PR #772](https://github.com/apollographql/react-apollo/pull/772)
- Fix: Add in missing types for MutationOpts [PR #770](https://github.com/apollographql/react-apollo/pull/770)

### 1.4.2

- Fix: Fix component reference and variable statement for flow types

### 1.4.1

- Fix: Fix compilation of test-utils from move to ES bundles

### 1.4.0

#### BREAKING FOR TYPESCRIPT USERS

- Feature: Enhanced typescript definitions to allow for more valid type checking of graphql HOC [PR #695](https://github.com/apollographql/react-apollo/pull/695)
- Feature: Flow types: [PR #695](https://github.com/apollographql/react-apollo/pull/695)
- Fix: Fix bug with sync re-renders and recyled queries [PR #740](https://github.com/apollographql/react-apollo/pull/740)

### 1.3.0

- Feature: Support tree shaking and smaller (marginally) bundles via rollup [PR #691](https://github.com/apollographql/react-apollo/pull/691)
- Fix: Render full markup on the server when using the `cache-and-network` fetchPolicy [PR #688](https://github.com/apollographql/react-apollo/pull/688)

### 1.2.0

- Fix: Use `standby` fetchPolicy for recycled queries [PR #671](https://github.com/apollographql/react-apollo/pull/671)

### 1.1.3

- Perf: Removed unneeded usage of shouldComponentUpdate [PR #661](https://github.com/apollographql/react-apollo/pull/661) inspired by [PR #653](https://github.com/apollographql/react-apollo/pull/653)
- Perf: Removed unneeded usage of shouldComponentUpdate in Provider [PR #669](https://github.com/apollographql/react-apollo/pull/669)
- Chore: remove unused immutable prop [PR #539](https://github.com/apollographql/react-apollo/pull/539)

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
import { getDataFromTree, renderToStringWithData } from 'react-apollo/server';

// new
import { getDataFromTree, renderToStringWithData } from 'react-apollo';
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
renderToStringWithData(component).then({ markup, initialState });

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

- Bug: Fix issue with changing outer props _and not changing variables_, ultimately caused by https://github.com/apollostack/apollo-client/pull/694

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
renderToStringWithData(component).then(markup); // markup had a script tag

// new

renderToStringWithData(component).then({ markup, initialState }); // markup has not tag, and state is passed
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
