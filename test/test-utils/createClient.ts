import { mockSingleLink } from '../../src/test-utils';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { DocumentNode } from 'graphql';

/**
 * helper for most common test client creation usage
 */
export default function createClient<TData>(
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
