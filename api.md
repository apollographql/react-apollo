
> This document serves as a guide line for the new react-apollo API design. The initial discussion can be found [here](https://github.com/apollostack/react-apollo/issues/29)

# API overview

`react-apollo` exposes three top level items for the client (and two for the server) which, when used in conjunction, make for easily binding graphql actions to react components. The intent of this library is to make co-location of graphql data simple, and mutations easy to use within components.

## `ApolloProvider`

Modeled after [`react-redux`](https://github.com/reactjs/react-redux), this is a component which binds the created client from `ApolloClient` to the store. It can be used as a drop in replacement for the `Provider` from `react-redux`, or used in with it.

Basic apollo version:

```js
import ApolloClient from 'apollo-client';
import { ApolloProvider } from 'react-apollo';

const client = new ApolloClient();

ReactDOM.render(
  <ApolloProvider client={client}>
    <MyRootComponent />
  </ApolloProvider>,
  rootEl
)
```

Used in conjunction with a redux store:

```js
import { createStore, combineReducers, applyMiddleware } from 'redux';
import ApolloClient from 'apollo-client';
import { ApolloProvider } from 'react-apollo';

import { todoReducer, userReducer } from './reducers';

const client = new ApolloClient();

const store = createStore(
  combineReducers({
    todos: todoReducer,
    users: userReducer,
    apollo: client.reducer(),
  }),
  applyMiddleware(client.middleware())
);

ReactDOM.render(
  <ApolloProvider store={store} client={client}>
    <MyRootComponent />
  </ApolloProvider>,
  rootEl
)
```

Used in conjunction with react-redux `Provider`:

```js
import { createStore, combineReducers, applyMiddleware } from 'redux';
import ApolloClient from 'apollo-client';
import { ApolloProvider } from 'react-apollo';
import { Provider } from 'react-redux';

import { todoReducer, userReducer } from './reducers';

const client = new ApolloClient();

const store = createStore(
  combineReducers({
    todos: todoReducer,
    users: userReducer,
    apollo: client.reducer(),
  }),
  applyMiddleware(client.middleware())
);

ReactDOM.render(
  <Provider store={store}>
    <ApolloProvider client={client}>
      <MyRootComponent />
    </ApolloProvider>
  </Provider>,
  rootEl
)
```

## `graphql`

`graphql` is a HOC [higher order component](https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750) which allows you to declare a graphql action (mutation or query) and have the data or actions it represents bound to the wrapped component. For queries, this means `graphql` handles the fetching and updating of information from the query using apollo's `watchQuery` method. For mutations, `graphql` binds the intended mutation to be called using apollo.

The signature of `graphql` is as follows:

```js
graphql(Document, (props) => QueryHandleOpts || MutataionHandleOpts, (result) => props)(Component)
```

Lets break that apart..

#### HOC

`graphql(/* arguments */)(Component)` in keeping with the HOC model, `graphql` should be used with either a react class, or a stateless component. It should *wrap* the component using either function syntax or as a decorator. For example:

```js
// function syntax
const MyComponent = (props) => (
  <div></div>
)

const MyComponentWithData = graphql(Document)(MyComponent);


@graphql(Document)
class MyDecoratedComponent extends Component {
  render() {
    return <div></div>
  }
}
```

Both of the above will return a wrapped component which will get the benefit of graphql integration.

#### Document

The first, and only required, argument of `graphql` is a graphql document. This cannot be a string so using a library like [`graphql-tag`](https://www.npmjs.com/package/graphql-tag) or a compilation step is recommended. This can either be a `query` or a `mutation` but not both. If a query name is not used (i.e. `{ user { name } }`, instead of `query getUser { user { name } }`, the data will be mapped to `this.props.data` by default). It is recommended to use a query name for the most control.

```js
import { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

@graphql(gql`
  query getUser {
    user { name }
  }
`)
class MyDecoratedComponent extends Component {
  render() {
    const { loading, user } = this.props.getUser;

    if (loading) return <h1>Loading...</h1>
    return <h1>{user.name}</h1>
  }
}
```

#### `(props) => QueryHandleOpts || MutataionHandleOpts` (mapPropsToOptions)

The second argument of `graphql` allows you to map the props passed from the parent component to create either options for [`watchQuery`](http://docs.apollostack.com/apollo-client/queries.html#watchQuery) or [`mutate`](http://docs.apollostack.com/apollo-client/mutations.html#mutate). The default is to pass `props` as the variables key in both option types (`(props) => ({ variables: props })`).

> if you are coming from the previous react-apollo where `state` was useable, this is where you can use `graphql` in concert with `connect` from react-redux

> XXX it would be awesome to be able to dynamically create flow and typescript definitions dynamically for wrapped components which describe the required and possible props.

Using the default method will expect an id key to exist on the props:

```js
import { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

@graphql(gql`
  query getUser(id: $ID!) {
    user { name }
  }
`)
class MyDecoratedComponent extends Component {
  render() {
    const { loading, user } = this.props.getUser;

    if (loading) return <h1>Loading...</h1>
    return <h1>{user.name}</h1>
  }
}
```

Using a custom mapping method which returns a computed option definition

```js
import { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

@graphql(gql`
  query getUser(id: $ID!) {
    user { name }
  }
`, (props) => ({ variables: { id: props.userId } }))
class MyDecoratedComponent extends Component {
  render() {
    const { loading, user } = this.props.getUser;

    if (loading) return <h1>Loading...</h1>
    return <h1>{user.name}</h1>
  }
}
```

Passing other option definitions

```js
import { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

@graphql(gql`
  query getUser(id: $ID!) {
    user { name }
  }
`, () => ({ pollInterval: 1000 }))
class MyDecoratedComponent extends Component {
  render() {
    const { loading, user } = this.props.getUser;

    if (loading) return <h1>Loading...</h1>
    return <h1>{user.name}</h1>
  }
}
```

#### `(result) => props` (mapResultToProps)

The third argument of `graphql` allows you to customize the props passed to the child component based on resulting data. It takes a method which receives the result object (which includes the data, the loading state, any errors, and client methods) and expects an object in return. This is similar to `react-redux`'s `mapStateToProps` method.

```js
import { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

@graphql(gql`
    query getUser(id: $ID!) {
      user { name }
    }
  `,
  null, // use default mapPropsToOptions function
  ({ loading, data, error, refetch }) => {
    if (loading) return { userLoading: true };
    if (error) return { hasErrors: true };
    return {
      currentUser: data.user,
      refetchUser: refetch
    };
  }
)
class MyDecoratedComponent extends Component {
  render() {
    const {
      userLoading,
      hasErrors,
      currentUser,
      refetchUser
    } = this.props;

    if (userLoading) return <h1>Loading...</h1>
    return <h1>{currentUser.name}</h1>
  }
}
```


### Queries

Using `graphql` with queries makes it easy to bind data to components. As seen above, `graphql` will use the query name of the passed document to assign the result to the props passed to the wrapped component. If no query name is found, it will use the key `data` on props. The shape of the result will be the following:

1. `loading: Boolean`
  Loading will be true if a query is in flight (including when calling refetch)

2. [`error: ApolloError`](http://docs.apollostack.com/apollo-client/queries.html#ApolloError)
  The error key will be `null` if no errors were created during the query

3. `...queries`
  `graphql` will merge the root queries used within the query document executed. This allows for multiple root queries to be located on the top level of the result. For instance:

  ```graphql
  query getUserAndLikes(id: $ID!) {
    user(userId: $id) { name }
    likes(userId: $id) { count }
  }
  ```

  will return a result object that includes `{ user: { name: "James" }, likes: { count: 10 } }`.


4. [`...QuerySubscription`](http://docs.apollostack.com/apollo-client/queries.html#QuerySubscription
)
  The subscription created on this query will be merged into the passed props so you can dynamically refetch, change polling settings, or even unsubscribe to this query.

5. [`query`](http://docs.apollostack.com/apollo-client/queries.html#query)
  Sometimes you may want to call a custom query within a component. To make this possible, `graphql` passes the query method from ApolloClient as a prop

6. [`mutate`](http://docs.apollostack.com/apollo-client/mutations.html#mutate)
  Sometimes you may want to call a custom mutation within a component. To make this possible, `graphql` passes the mutate method from ApolloClient as a prop


### Mutations

Using `graphql` with mutations makes it easy to bind actions to components. Unlike queries, mutations return only a single method (the mutation method) to the wrapped component.

> Previously react-apollo tried to match the shape of mutation props with that of query props. I don't think that was super helpful so mutation props match the need of mutations.

```js
import { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

@graphql(gql`
  mutation addTask($text: String!, $list_id: ID!) {
    addNewTask(text: $text, list_id: $list_id) {
      id
      text
      completed
      createdAt
    }
  }
`)
class MyDecoratedComponent extends Component {

  onClick = () => {
    this.props.addTask({ text: "task", list_id: 1 })
      .then(({ data }) => {
        console.log('got data', data);
      }).catch((error) => {
        console.log('there was an error sending the query', error);
      });
  }

  render() {
    return <h1 onClick={this.onClick}>Add Task</h1>
  }
}
```

## `combine`

Sometimes components need both queries and mutations, or they need multiple queries that should be requested separately. In order to make this easy when using the `graphql` HOC, `react-apollo` exports a `combine` function. This function allows you to pass multiple `graphql` functions which will wrap a single component.

Usage:

```js
import { Component } from 'react';
import { graphql, combine } from 'react-apollo';
import gql from 'graphql-tag';

const UserData = graphql(gql`
  query getUser {
    user { name }
  }
`)

const UserMutation = graphq(gql`
  mutation createUser($userId: String!) {
     createUser(id: $userId) {
       name
     }
  }
`)

@combine([UserData, UserMutation])
class MyDecoratedComponent extends Component {
  render() {
    const { loading, user } = this.props.getUser;

    if (loading) return <h1>Loading...</h1>
    return <h1>{user.name}</h1>
  }
}

// can also be used as
const MyComponentWithData = combine([UserData, UserMutation])(MyComponent);
```


# Server methods

react-apollo supports integrated server side rendering for both store rehydration purposes, or fully rendered markup.

## `getDataFromTree`

The `getDataFromTree` method takes your react tree and returns an object with `initialState`, the apollo client (as `client`) and the redux store as `store`.
`initialState` is the hydrated data of your redux store prior to app rendering. Either `initialState` or `store.getState()` can be used for server side rehydration.

```js
// no changes to client :tada:

// server application code (custom usage)
import { getDataFromTree } from "react-apollo/server"

// during request
getDataFromTree(app).then(({ initialState, store, client }) => {
  // markup with data from requests
  const markup = ReactDOM.renderToString(app);
});
```

## `renderToStringWithData`
The `renderToStringWithData` takes your react tree and returns the stringified tree with all data requirements. It also injects a script tag that includes `window. __APOLLO_STATE__ ` which equals the full redux store for hydration. This is a synchronous method to make it easy to drop in and replace `renderToString`

```js
// no changes to client :tada:

// server application code (integrated usage)
import { renderToStringWithData } from "react-apollo/server"

// during request
const markup = renderToStringWithData(app)

```

> Server notes:
  When creating the client on the server, it is best to use `ssrMode: true`. This prevents unneeded force refetching in the tree walking.

> Client notes:
  When creating new client, you can pass `initialState: __APOLLO_STATE__ ` to rehydrate which will stop the client from trying to requery data.
