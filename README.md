# [React Apollo](http://dev.apollodata.com/react/) [![npm version](https://badge.fury.io/js/react-apollo.svg)](https://badge.fury.io/js/react-apollo) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

React Apollo allows you to fetch data from your GraphQL server and use it in building complex and reactive UIs using the React framework. React Apollo may be used in any context that React may be used. In the browser, in React Native, or in Node.js when you want to do server-side rendering.

React Apollo unlike many other tools in the React ecosystem requires _no_ complex build setup to get up and running. As long as you have a GraphQL server you can get started building out your application with React immediately. React Apollo works out of the box with both [`create-react-app`][] and [React Native][] with a single install and with no extra hassle configuring Babel or other JavaScript tools.

[`create-react-app`]: https://github.com/facebookincubator/create-react-app
[react native]: http://facebook.github.io/react-native

React Apollo is:

1.  **Incrementally adoptable**, so that you can drop it into an existing JavaScript app and start using GraphQL for just part of your UI.
2.  **Universally compatible**, so that Apollo works with any build setup, any GraphQL server, and any GraphQL schema.
3.  **Simple to get started with**, you can start loading data right away and learn about advanced features later.
4.  **Inspectable and understandable**, so that you can have great developer tools to understand exactly what is happening in your app.
5.  **Built for interactive apps**, so your users can make changes and see them reflected in the UI immediately.
6.  **Small and flexible**, so you don't get stuff you don't need. The core is under 25kb compressed.
7.  **Community driven**, Apollo is driven by the community and serves a variety of use cases. Everything is planned and developed in the open.

Get started today on the app you’ve been dreaming of, and let React Apollo take you to the moon!

## Installation

It is simple to install React Apollo and related libraries

```bash
# installing the preset package (apollo-boost) and react integration
npm install apollo-boost react-apollo graphql-tag graphql --save

# installing each piece independently
npm install apollo-client apollo-cache-inmemory apollo-link-http react-apollo graphql-tag graphql --save
```

[apollo-boost](https://github.com/apollographql/apollo-client/tree/master/packages/apollo-boost) is a minimal config way to start using Apollo Client. It includes some sensible defaults, such as `InMemoryCache` and `HttpLink`.

That’s it! You may now use React Apollo in any of your React environments.

For an amazing developer experience you may also install the [Apollo Client Developer tools for Chrome][] which will give you inspectability into your React Apollo data.

[apollo client developer tools for chrome]: https://chrome.google.com/webstore/detail/apollo-client-developer-t/jdkknkkbebbapilgoeccciglkfbmbnfm

## Usage

> Looking for apollo 1.x docs? See [here](https://s3.amazonaws.com/apollo-docs-1.x/index.html).

To get started you will first want to create an instance of [`ApolloClient`][] and then you will want to provide that client to your React component tree using the [`<ApolloProvider/>`][] component. Finally, we will show you a basic example of connecting your GraphQL data to your React components with the [`<Query>`][] component.

First we want an instance of [`ApolloClient`][]. We can import the class from `apollo-client`.
To get started, create an ApolloClient instance and point it at your GraphQL server:

```js
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

const client = new ApolloClient({
  // By default, this client will send queries to the
  //  `/graphql` endpoint on the same host
  // Pass the configuration option { uri: YOUR_GRAPHQL_API_URL } to the `HttpLink` to connect
  // to a different host
  link: new HttpLink(),
  cache: new InMemoryCache(),
});
```

If you're using [apollo-boost](https://github.com/apollographql/apollo-client/tree/master/packages/apollo-boost), you can create an `ApolloClient` that uses `HttpLink` and `InMemoryCache` like so:

```js
import { ApolloClient } from 'apollo-boost';

const client = new ApolloClient();
```

> Migrating from 1.x? See the [2.0 migration guide](https://www.apollographql.com/docs/react/recipes/2.0-migration.html).

Next you will want to add a [`<ApolloProvider/>`][] component to the root of your React component tree. This component [provides](https://reactjs.org/docs/context.html) the React Apollo functionality to all the other components in the application without passing it explicitly. To use an [`<ApolloProvider/>`][] with your newly constructed client see the following:

```js
import { ApolloProvider } from 'react-apollo';

ReactDOM.render(
  <ApolloProvider client={client}>
    <MyRootComponent />
  </ApolloProvider>,
  document.getElementById('root'),
);
```

Now you may create components in this React tree that are connected to your GraphQL API.

Finally, to demonstrate the power of React Apollo in building interactive UIs let us connect one of your components to your GraphQL server using the [`<Query>`][] component:

You'll need install `graphql-tag` to use `gql` module:

```bash
npm install graphql-tag --save
```

```js
import gql from 'graphql-tag';
import { Query } from 'react-apollo';

const GET_DOGS = gql`
  {
    dogs {
      id
      breed
    }
  }
`;

const Dogs = ({ onDogSelected }) => (
  <Query query={GET_DOGS}>
    {({ loading, error, data }) => {
      if (loading) return 'Loading...';
      if (error) return `Error! ${error.message}`;

      return (
        <select name="dog" onChange={onDogSelected}>
          {data.dogs.map(dog => (
            <option key={dog.id} value={dog.breed}>
              {dog.breed}
            </option>
          ))}
        </select>
      );
    }}
  </Query>
);
```

If you render Dogs within your App component, you’ll first see a loading state and then a form with a list of dog breeds once Apollo Client receives the data from the server.

To learn more about querying with React Apollo be sure to start reading the [documentation article on Queries][]. If you would like to see all of the features React Apollo supports be sure to check out the [complete API reference][].

[`apolloclient`]: https://www.apollographql.com/docs/react/api/apollo-client.html#apollo-client
[`<apolloprovider/>`]: https://www.apollographql.com/docs/react/api/react-apollo.html#ApolloProvider
[`<query>`]: https://www.apollographql.com/docs/react/essentials/queries.html
[documentation article on queries]: http://dev.apollodata.com/react/queries.html
[complete api reference]: https://www.apollographql.com/docs/react/api/react-apollo.html

## Polyfills

React Apollo makes use of `Object.assign`, which is not supported in certain browsers (most prominently, IE11). If you wish to support legacy browsers, you will need to import a polyfill. As an example, you could use `core-js`'s polyfill like so:

```js
import 'core-js/fn/object/assign';
```

## Documentation

For a complete React Apollo API reference visit the documentation website at: [https://www.apollographql.com/docs/react/api/react-apollo.html](https://www.apollographql.com/docs/react/api/react-apollo.html)

All of the documentation for React Apollo including usage articles and helpful recipes lives on: [https://www.apollographql.com/docs/react/](https://www.apollographql.com/docs/react/)

### Recipes

- [Authentication](http://dev.apollodata.com/react/auth.html)
- [Pagination](http://dev.apollodata.com/react/pagination.html)
- [Optimistic UI](http://dev.apollodata.com/react/optimistic-ui.html)
- [Server Side Rendering](https://www.apollographql.com/docs/react/recipes/server-side-rendering.html)

## Maintainers

- [@benjamn](https://github.com/benjamn) (Apollo)
- [@hwillson](https://github.com/hwillson) (Apollo)
