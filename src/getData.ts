
import { Children } from 'react';
import ApolloClient from 'apollo-client';
import flatten = require('lodash.flatten');
import assign = require('object-assign');

export default function getData(tree, props: any = {}): Promise<any> {
  let client;
  let store;
  function getQueriesFromTree(components, queries = []) {
    Children.forEach(components, (child: any) => {
      if (!child) {
        return;
      }

      if (!store && child.props && child.props.store) {
        store = store;
      }

      // find the client in the tree
      if (!client && child.props && child.props.client instanceof ApolloClient) {
        client = child.props.client as ApolloClient;
        if (!store) {
          client.initStore();
          store = client.store;
        }
      }

      if (child.type && typeof child.type.mapQueriesToProps === 'function') {
        queries.push(child.type.mapQueriesToProps);
      }
      if (child.props && child.props.children) {
        getQueriesFromTree(child.props.children, queries);
      }
    });
    return queries;
  }

  const rawQueries = getQueriesFromTree(tree);
  if (!rawQueries.length || !client) {
    return Promise.resolve(null);
  }

  const ownProps = props;
  const state = store.getState();

  let queries = rawQueries
    .map(x => x({ ownProps, state }))
    .map(x => {
      const queryOptions = [];
      for (let key in x) {
        if (!x[key].query || !x[key].ssr) {
          continue;
        }
        queryOptions.push(x[key]);
      }
      return queryOptions;
    });

  queries = flatten(queries).map(x => {
    return client.query(x)
      .then(result => {
        const { data, errors } = result;
        return assign({ loading: false, errors }, data);
      });
  });

  return Promise.all(queries);
}
