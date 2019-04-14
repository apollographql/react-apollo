import React from 'react';
import { InvariantError } from 'ts-invariant';
import { getApolloContext } from './ApolloContext';
export var ApolloConsumer = function (props) {
    var ApolloContext = getApolloContext();
    return (React.createElement(ApolloContext.Consumer, null, function (context) {
        if (!context || !context.client) {
            throw new InvariantError('Could not find "client" in the context of ApolloConsumer. ' +
                'Wrap the root component in an <ApolloProvider>.');
        }
        return props.children(context.client);
    }));
};
//# sourceMappingURL=ApolloConsumer.js.map