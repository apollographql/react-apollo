# react-apollo

[![npm version](https://badge.fury.io/js/react-apollo.svg)](https://badge.fury.io/js/react-apollo)
[![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)
[![Build Status](https://travis-ci.org/apollostack/react-apollo.svg?branch=master)](https://travis-ci.org/apollostack/react-apollo)
[![Coverage Status](https://coveralls.io/repos/github/apollostack/react-apollo/badge.svg?branch=master)](https://coveralls.io/github/apollostack/react-apollo?branch=master)

Use your GraphQL server data in your React components, with the [Apollo Client](https://github.com/apollostack/apollo-client).

- [Install](#install)
- [Docs](http://docs.apollostack.com/apollo-client/react.html)

### Documentation

Documentation for this client can be found [here](http://docs.apollostack.com/apollo-client/react.html);

### Local Development

If you'd like to run a local copy of this package, you can follow these steps:

- Clone this repo locally.
- In your local `react-apollo` directory: `npm link` then `npm run compile`.
- In your app's directory: `npm link react-apollo`.

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
