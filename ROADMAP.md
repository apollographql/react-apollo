# Roadmap
This file is intended to be an up to date roadmap for future work on react-apollo. It does not cover patch level changes and some minor changes may be missed. Checkout the [Changelog](./Changelog.md) for detailed release information.

## 2.0
In the 2.0 we want to ensure support for Apollo Client 2.0. It will remove the direct dependency of apollo-client to prevent the need for a breaking change with Apollo Client has one in the future. Since React Apollo exports Apollo Client, the 2.0 of Apollo Client requires a semver breaking change of React Apollo.

Nothing should actually change in your React app with the 2.0 (expect it'll be faster :tada:). The 2.0 is nearly 100% backwards compatiable with the 1.* expect for the removal of Redux store management in the Provider!

## 2.1
The 2.1 of react-apollo will feature quite a lot of new features while being 100% backwards compatiable to the 2.0 version so its just a minor version bump. The 2.1 will be a large reorganization of this project and include first class support for Preact and Inferno usage.

The 2.1 will split up this project into a lerna repository with both examples and multiple packages. What is currently react-apollo will be split into the following new (planned) packages:

- apollo-component
- react-apollo
- preact-apollo
- inferno-apollo
- react-server-async (getDataFromTree and improved versions)
- preact-server-async (if needed to be different from ^^)
- reason-react-apollo (Bucklescript bindings)
- apollo-component-test-utils

### Apollo Component
Apollo Component is the new underlying library that powers all of the view level packages. It will export out an `ApolloProvider` for putting apollo in the context of the react tree, a new component based suite of API's, and an expanded HOC suite. The raw components will be used by the libraries to determine what Component class to use.

**ApolloProvider**
The ApolloProvider will remove any reference to Redux and a concept of the `store`. Instead, it will accept a client and include it the context. QueryRecycler should be able to be removed in favor of first class recycle support in the 2.1 of Apollo Client.

**Higher Order Components**
The current `graphql` API will stay the same with the one change of allowing a function instead of just a `DocumentNode` for the first argument. This will no longer be the reccomended way to use react-apollo, instead we will promote the new HOC's and/or the Component methods. However, this will allow for dynamic operations based on props.

```js
graphql(DocumentNode || (props) => DocumentNode, {
  skip: (props) => boolean,
  options: (props) => boolean,
  name: string
  props: ({ ownProps, data }) => any
});
```

Along with `graphql`, the new package will export out `query`, `mutation`, and `subscription` which will be tuned for the specific operations.

```js
// query
query((ownProps) => ({
  query: DocumentNode
  options: QueryOptions
  skip: boolean,
  props: (data) => any
}))

// mutation
mutation((ownProps) => ({
  mutation: DocumentNode,
  options: MutationOptions,
  props: (data) => any
}))

// subscription
subscription((ownProps) => ({
  subscription: DocumentNode,
  options: SubscriptionOptions,
  skip: boolean,
  props: (data) => any
}))

```

They're may be more features added to these HOC's during full design.

**Query**
A new way to interact with Apollo and React, the `Query` component will allow using Apollo without an higher order component. It will allow for dynamic queries and options driven by props while using a render prop to manage controlling props. A rough draft of this component looks like this:

```js
<Query
  skip={boolean}
  options={QueryOptions}
  loading={(result?) => Component || null}
  error={(result?) => Component || null}
  render={(result) => Component}
/>
```

**Mutation**
Like the `Query` component, the `Mutation` component will allow using Apollo without an HOC but still get all of the benefits of Apollo. The rough draft looks something like this:

```js
<Mutation
  stateUpdater={this.setState}
  options={MutationOptions}
  render={(result) => Component}
/>
```

The stateUpdater prop allows for setting local component state based on the state of the *latest* mutation fired or potentially allow a Map of results and statues. This API is still early and may change.

**Subscription**
Much like the other two component driven ways outlined above, `Subscription` will function much like `Query`. This design is still very much in flux and feedback is very welcome!

### React || Preact || Inferno
Due to the refactoring of the library, the 2.1 will allow first class support for API matching implementations of React.

### SSR
We think SSR is one of the best features of React Apollo and want to continue to improve it! The 2.1 will feature a new option called `ssrPolicy` which will allow you to skip (same as ssr: false), fetch the data but stop the tree render (`ssrPolicy: 'hydrate'`) or do a full render (same as ssr: true).

Along with this change, we have high hopes for merging the async data fetching this library currently provides with a new `renderToStreamWithData` function to match React's `renderToStream` function (or possibly PR it into React :fingerscrossed:). This will allow rendering and fetching data to happen together and return a stream directly to the request. It should be the most efficient way to do SSR while still fetching data.

### Reason
With the lerna refactor, we will be able to start providing official bucklescript bindings for both Apollo Client and React Apollo :tada:. If you would like to help with this PLEASE reach out on slack!

### Test Utils
Testing of Apollo is currently harder than it should be. The test utils will become its own package (though `/test-utils`) won't change so its not breaking. This API is still in early sketch!
