# react-apollo

[![npm version](https://badge.fury.io/js/react-apollo.svg)](https://badge.fury.io/js/apollo-client)
[![Get on Slack](http://slack.apollostack.com/badge.svg)](http://slack.apollostack.com/)
[![Build Status](https://travis-ci.org/apollostack/react-apollo.svg?branch=master)](https://travis-ci.org/apollostack/react-apollo)
[![Coverage Status](https://coveralls.io/repos/github/apollostack/react-apollo/badge.svg?branch=master)](https://coveralls.io/github/apollostack/react-apollo?branch=master)

Use your GraphQL server data in your React components, with the [Apollo Client](https://github.com/apollostack/apollo-client).

- [Example](#example-use)
- [Install](#install)
- [Docs](http://docs.apollostack.com/apollo-client/react.html)

### Documentation

Documentation for this client can be found [here](http://docs.apollostack.com/apollo-client/react.html);


## Example use:

```js
import React from 'react';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import { Provider } from 'react-apollo';

const networkInterface = createNetworkInterface('http://graphql-swapi.parseapp.com/');
const client = new ApolloClient({
  networkInterface,
});

function mapQueriesToProps({ ownProps, state }) {
  return {
    people: {
      query: `
        query people {
          allPeople(first: 10) {
            people {
              name
            }
          }
        }
      `,
      variables: {
        categoryId: 5,
      },
    },
  };
};

@connect({ mapQueriesToProps })
class StarWarsPeople extends React.Component {
  render() {
    const { allPeople } = this.props.people;
    return (
      <div>
        {allPeople.people.map((person, key) => (
          <div>
            <h1 key={key}>{person}</h1>
          </div>
        ))}
      </div>
    )
  }
};

ReactDOM.render(
  <Provider client={client}>
    <StarWarsPeople />
  </Provider>
  document.body
)
```

## Install

```bash
npm install react-apollo --save
```

Running tests locally:

```
npm install
npm test
```

This project uses TypeScript for static typing and TSLint for linting. You can get both of these built into your editor with no configuration by opening this project in [Visual Studio Code](https://code.visualstudio.com/), an open source IDE which is available for free on all platforms.
