# apollo-react

Use your GraphQL server data in your React components, with the Apollo Client.

## API sketch

I'd like to base this very heavily on the [`react-redux` API](https://github.com/reactjs/react-redux/blob/master/docs/api.md#api) and have the same parts - a `Provider` component and a `connect` function. Ideally, if you are using Apollo and Redux together, you don't have to nest calls to providers and containers - they should just work together. So, here we go!

### Provider

Injects an ApolloClient instance into a React view tree. You can use it instead of the Redux `Provider`, if you want to. But you don't have to:

Basic Apollo version:

```js
import { ApolloClient } from 'apollo-client';
import { Provider } from 'apollo-react';

const client = new ApolloClient();

ReactDOM.render(
  <Provider client={client}>
    <MyRootComponent />
  </Provider>,
  rootEl
)
```

With an existing Redux store:

```js
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { ApolloClient } from 'apollo-client';
import { Provider } from 'apollo-react';

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
  <Provider store={store} client={client}>
    <MyRootComponent />
  </Provider>,
  rootEl
)
```

Note that this design calls it just `Provider`, which is appropriate because in the base case you can use it instead of the Redux provider.

### connect

Works like Redux `connect`, but supports two more properties:

- `mapQueriesToProps` to connect GraphQL queries to fetch data
- `mapMutationsToProps` to connect mutations with your components

It also uses keyword arguments instead of positional arguments, since that lets you more easily omit certain fields when you don't need them.

Basic Apollo version:

```js
import { connect } from 'apollo-react';

import Category from '../components/Category';

function mapQueriesToProps({ watchQuery, ownProps, state }) {
  return {
    category: watchQuery({
      query: `
        query getCategory($categoryId: Int!) {
          category(id: $categoryId) {
            name
            color
          }
        }
      `,
      variables: {
        categoryId: 5,
      },
      forceFetch: false,
      returnPartialData: true,
    })
  }
}

function mapMutationsToProps({ mutate, ownProps, state }) {
  return {
    onPostReply(raw) {
      return mutate({
        mutation: `
          mutation postReply(
            $topic_id: ID!
            $category_id: ID!
            $raw: String!
          ) {
            createPost(
              topic_id: $topic_id
              category: $category_id
              raw: $raw
            ) {
              id
              cooked
            }
          }
        `,
        variables: {
          // Use the container component's props
          topic_id: ownProps.topic_id,

          // Use the redux state
          category_id: state.selectedCategory,

          // Use an argument passed from the callback
          raw,
        }
      });
    }
  }
}

const CategoryWithData = connect({
  mapQueriesToProps,
  mapMutationsToProps,
})(Category);

export default CategoryWithData;
```

Note that `watchQuery` takes the same arguments as [`ApolloClient#watchQuery`](http://docs.apollostack.com/apollo-client/index.html#watchQuery). In this case, the `Category` component will get a prop called `category`, which has the following keys:

```js
{
  loading: boolean,
  error: Error,
  result: GraphQLResult,
}
```

Using in concert with Redux:

```js
// ... same as above

function mapStateToProps({ state, ownProps }) {
  return {
    selectedCategory: state.selectedCategory,
  }
}

const CategoryWithData = connect({
  mapQueriesToProps,
  mapMutationsToProps,
  mapStateToProps,
})(Category);

export default CategoryWithData;
```

In this case, `CategoryWithData` gets two props: `category` and `selectedCategory`.
