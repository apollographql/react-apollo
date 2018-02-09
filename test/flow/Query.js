// @flow

import gql from 'graphql-tag';
import React, { Component } from 'react';

import { Query } from '../../src';

const query = gql`
  query test($name: String!) {
    foo(name: $name)
  }
`;

type Data = {
  foo: string,
};

type Variables = {
  name: string,
};

class QueryWithData extends Query<Data, Variables> {}

let QueryComponent = () => (
  <QueryWithData query={query} variables={{ name: 'bar' }}>
    {response => {
      const { loading, error, data } = response;

      if (loading) {
        return <div>..loading</div>;
      } else if (error) {
        return <div>error</div>;
      } else if (data) {
        return <div>{data.foo}</div>;
      }
      return null;
    }}
  </QueryWithData>
);

QueryComponent = () => (
  // $ExpectError No children render function passed
  <QueryWithData query={query} />
);

QueryComponent = () => (
  // $ExpectError
  <QueryWithData query={query} variables={{ wrong: 'wrong' }}>
    {response => null}
  </QueryWithData>
);

QueryComponent = () => (
  // $ExpectError Missing query prop
  <QueryWithData>{response => null}</QueryWithData>
);

QueryComponent = () => (
  // $ExpectError
  <QueryWithData query={'__wrong__'}>{response => null}</QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      const { data } = response;
      if (data) {
        // $ExpectError
        return <div>{data.unknownKey}</div>;
      }
      return null;
    }}
  </QueryWithData>
);

QueryComponent = () => (
  // $ExpectError
  <QueryWithData query={query} fetchPolicy="__wrong__">
    {response => null}
  </QueryWithData>
);

QueryComponent = () => (
  // $ExpectError
  <QueryWithData query={query} notifyOnNetworkStatusChange="__wrong__">
    {response => null}
  </QueryWithData>
);

QueryComponent = () => (
  // $ExpectError
  <QueryWithData query={query} pollInterval="__wrong__">
    {response => null}
  </QueryWithData>
);

QueryComponent = () => (
  // $ExpectError
  <QueryWithData query={query} ssr="__wrong__">
    {response => null}
  </QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      // $ExpectError NetworkStatus is a number
      const wrongStatusType: string = response.networkStatus;
    }}
  </QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      const { fetchMore } = response;

      fetchMore({
        query,
        variables: { name: "other name"},
        updateQuery: (previousQueryResult, options) => {
          
          // $ExpectError
          previousQueryResult.unknownKey;
          
          // $ExpectError
          options.variables.unknownKey;
          
          if (options.fetchMoreResult) {
            // $ExpectError
            options.fetchMoreResult.unknownKey;
            
            options.fetchMoreResult.foo;
          }
          
          return previousQueryResult;
        }
      });
      
      fetchMore({
        // $ExpectError
        query: "wrong",
        // $ExpectError
        updateQuery: (previousQueryResult, options) => null
      })
    }}
  </QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      const { refetch } = response;

      refetch({ name: 'hello' }).then(refetchResult => {
        const { data, errors, loading, networkStatus, stale } = refetchResult;
        
        // $ExpectError
        data.unknownKey;
        
        // $ExpectError
        const errorTyped: string = errors;
        
        // $ExpectError
        const loadingTyped: string = loading;
        
        // $ExpectError
        const networkStatusTyped: string = networkStatus;
        
        // $ExpectError
        const staleTyped: string = stale;
      });

      // $ExpectError
      refetch({ wrong: 'variables' });

      return null;
    }}
  </QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      const { startPolling } = response;

      // $ExpectError
      startPolling('__wrong__');

      return null;
    }}
  </QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      const { stopPolling } = response;

      // $ExpectError
      stopPolling('should_not_accept_parameter');

      return null;
    }}
  </QueryWithData>
);

QueryComponent = () => (
  <QueryWithData query={query}>
    {response => {
      const { updateQuery } = response;

      updateQuery((previousQueryResult, options) => {
        // $ExpectError
        previousQueryResult.unknownKey;

        // $ExpectError
        options.unknownKey;

        options.variables;

        // $ExpectError
        return null;
      });

      updateQuery((previousQueryResult, options) => previousQueryResult);
      return null;
    }}
  </QueryWithData>
);
