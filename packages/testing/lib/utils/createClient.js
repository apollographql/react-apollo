import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { mockSingleLink } from '../mocks/mockLink';
export function createClient(data, query, variables) {
    if (variables === void 0) { variables = {}; }
    return new ApolloClient({
        link: mockSingleLink({
            request: { query: query, variables: variables },
            result: { data: data },
        }),
        cache: new InMemoryCache({ addTypename: false }),
    });
}
//# sourceMappingURL=createClient.js.map