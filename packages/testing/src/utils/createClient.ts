import { ApolloClient } from 'apollo-client';
import { InMemoryCache, NormalizedCacheObject } from 'apollo-cache-inmemory';
import { DocumentNode } from 'graphql';

import { mockSingleLink } from '../mocks/mockLink';

export function createClient<TData>(
  data: TData,
  query: DocumentNode,
  variables = {},
): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    link: mockSingleLink({
      request: { query, variables },
      result: { data },
    }),
    cache: new InMemoryCache({ addTypename: false }),
  });
}
