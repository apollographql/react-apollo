import { invariant } from 'ts-invariant';
export function getClient(props, context) {
    var client = props.client || context.client;
    invariant(!!client, 'Could not find "client" in the context or passed in as a prop. ' +
        'Wrap the root component in an <ApolloProvider>, or pass an ' +
        'ApolloClient instance in via props.');
    return client;
}
//# sourceMappingURL=getClient.js.map