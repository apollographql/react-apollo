# [React Apollo](http://dev.apollodata.com/react/) [![npm version](https://badge.fury.io/js/react-apollo.svg)](https://badge.fury.io/js/react-apollo) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

React Apollo allows you to fetch data from your GraphQL server and use it in building complex and reactive UIs using the React framework. React Apollo may be used in any context that React may be used. In the browser, in React Native, or in Node.js when you want to server side render.

React Apollo unlike many other tools in the React ecosystem requires _no_ complex build setup to get up and running. As long as you have a GraphQL server you can get started building out your application with React immediately. React Apollo works out of the box with both [`create-react-app`][] and [React Native][] with a single install and with no extra hassle configuring Babel or other JavaScript tools.

[`create-react-app`]: https://github.com/facebookincubator/create-react-app
[React Native]: http://facebook.github.io/react-native

React Apollo is:

1. **Incrementally adoptable**, so that you can drop it into an existing JavaScript app and start using GraphQL for just part of your UI.
2. **Universally compatible**, so that Apollo works with any build setup, any GraphQL server, and any GraphQL schema.
2. **Simple to get started with**, you can start loading data right away and learn about advanced features later.
3. **Inspectable and understandable**, so that you can have great developer tools to understand exactly what is happening in your app.
4. **Built for interactive apps**, so your users can make changes and see them reflected in the UI immediately.
4. **Small and flexible**, so you don't get stuff you don't need. The core is under 25kb compressed.
5. **Community driven**, Apollo is driven by the community and serves a variety of use cases. Everything is planned and developed in the open.

Get started today on the app you’ve been dreaming of, and let React Apollo take you to the moon!

## Installation

It is simple to install React Apollo.

```bash
npm install react-apollo --save
```

That’s it! You may now use React Apollo in any of your React environments.

For an amazing developer experience you may also install the [Apollo Client Developer tools for Chrome][] which will give you inspectability into your React Apollo data.

[Apollo Client Developer tools for Chrome]: https://chrome.google.com/webstore/detail/apollo-client-developer-t/jdkknkkbebbapilgoeccciglkfbmbnfm

## Usage

To get started you will first want to create an instance of [`ApolloClient`][] and then you will want to provide that client to your React component tree using the [`<ApolloProvider/>`][] component. Finally, we will show you a basic example of connecting your GraphQL data to your React components with the [`graphql()`][] enhancer function.

First we want an instance of [`ApolloClient`][]. We can import the class from `react-apollo` and construct it like so:

```js
import { ApolloClient } from 'react-apollo';

const client = new ApolloClient();
```

This will create a new client that you can use for all of your GraphQL data fetching needs, but most of the time you will also want to create your own custom network interface. By default Apollo Client guesses that your GraphQL API lives at `/graphql`, but this is not always the case. To use your own network interface you may call the [`createNetworkInterface`][] function:

```js
import { ApolloClient, createNetworkInterface } from 'react-apollo';

const client = new ApolloClient({
  networkInterface: createNetworkInterface({
    uri: 'https://graphql.example.com',
  }),
});
```

Replace `https://graphql.example.com` with your GraphQL API’s URL to connect to your API.

Next you will want to add a [`<ApolloProvider/>`][] component to the root of your React component tree. This component works almost the same as the [`<Provider/>` component in `react-redux`][]. In fact if you pass a `store` prop into [`<ApolloProvider/>`][] it will also serve as a provider for `react-redux`! To use an [`<ApolloProvider/>`][] with your newly constructed client see the following:

```js
import { ApolloProvider } from 'react-apollo';

ReactDOM.render(
  <ApolloProvider client={client}>
    <MyRootComponent/>
  </ApolloProvider>,
  document.getElementById('root'),
);
```

Now you may create components in this React tree that are connected to your GraphQL API.

Finally, to demonstrate the power of React Apollo in building interactive UIs let us connect one of your component’s to your GraphQL server using the [`graphql()`][] component enhancer:

```js
import { gql, graphql } from 'react-apollo';

function TodoApp({ data: { todos, refetch } }) {
  return (
    <div>
      <button onClick={() => refetch()}>
        Refresh
      </button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default graphql(gql`
  query TodoAppQuery {
    todos {
      id
      text
    }
  }
`)(TodoApp);
```

With that your `<TodoApp/>` component is now connected to your GraphQL API. Whenever some other component modifies the data in your cache, this component will automatically be updated with the new data.

To learn more about querying with React Apollo be sure to start reading the [documentation article on Queries][]. If you would like to see all of the features React Apollo supports be sure to check out the [complete API reference][].

There is also an excellent [**Full-stack React + GraphQL Tutorial**][] on the Apollo developer blog.

[`ApolloClient`]: http://dev.apollodata.com/core/apollo-client-api.html#apollo-client
[`<ApolloProvider/>`]: http://dev.apollodata.com/react/api.html#ApolloProvider
[`graphql()`]: http://dev.apollodata.com/react/api.html#graphql
[`createNetworkInterface`]: http://dev.apollodata.com/core/network.html
[`<Provider/>` component in `react-redux`]: https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store
[documentation article on Queries]: http://dev.apollodata.com/react/queries.html
[complete API reference]: http://dev.apollodata.com/react/api.html
[**Full-stack React + GraphQL Tutorial**]: https://dev-blog.apollodata.com/full-stack-react-graphql-tutorial-582ac8d24e3b#.w8e9j7jmp
[Learn Apollo]: https://www.learnapollo.com/

## Documentation

For a complete React Apollo API reference visit the documentation website at: [http://dev.apollodata.com/react/api.html](http://dev.apollodata.com/react/api.html)

All of the documentation for React Apollo including usage articles and helpful recipes lives on: [http://dev.apollodata.com/react/](http://dev.apollodata.com/react/)

### Recipes

- [Authentication](http://dev.apollodata.com/react/auth.html)
- [Pagination](http://dev.apollodata.com/react/pagination.html)
- [Optimistic UI](http://dev.apollodata.com/react/optimistic-ui.html)
- [Server Side Rendering](http://dev.apollodata.com/react/server-side-rendering.html)
