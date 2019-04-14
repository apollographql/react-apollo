(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('ts-invariant')) :
    typeof define === 'function' && define.amd ? define(['exports', 'react', 'ts-invariant'], factory) :
    (global = global || self, factory(global['react-common'] = {}, global.React, global.invariant));
}(this, function (exports, React, tsInvariant) { 'use strict';

    React = React && React.hasOwnProperty('default') ? React['default'] : React;

    var apolloContext;
    function getApolloContext() {
        if (!apolloContext) {
            apolloContext = React.createContext({});
        }
        return apolloContext;
    }
    function resetApolloContext() {
        apolloContext = React.createContext({});
    }

    var ApolloProvider = function (_a) {
        var client = _a.client, children = _a.children;
        var ApolloContext = getApolloContext();
        return React.createElement(ApolloContext.Consumer, null, function (context) {
            if (context === void 0) { context = {}; }
            if (client) {
                context.client = client;
            }
            process.env.NODE_ENV === "production" ? tsInvariant.invariant(context.client) : tsInvariant.invariant(context.client, 'ApolloProvider was not passed a client instance. Make ' +
                'sure you pass in your client via the "client" prop.');
            return (React.createElement(ApolloContext.Provider, { value: context }, children));
        });
    };

    var ApolloConsumer = function (props) {
        var ApolloContext = getApolloContext();
        return React.createElement(ApolloContext.Consumer, null, function (context) {
            if (!context || !context.client) {
                throw process.env.NODE_ENV === "production" ? new tsInvariant.InvariantError() : new tsInvariant.InvariantError('Could not find "client" in the context of ApolloConsumer. ' +
                    'Wrap the root component in an <ApolloProvider>.');
            }
            return props.children(context.client);
        });
    };


    (function (DocumentType) {
        DocumentType[DocumentType["Query"] = 0] = "Query";
        DocumentType[DocumentType["Mutation"] = 1] = "Mutation";
        DocumentType[DocumentType["Subscription"] = 2] = "Subscription";
    })(exports.DocumentType || (exports.DocumentType = {}));
    var cache = new Map();
    function parser(document) {
        var cached = cache.get(document);
        if (cached)
            return cached;
        var variables, type, name;
        process.env.NODE_ENV === "production" ? tsInvariant.invariant(!!document && !!document.kind) : tsInvariant.invariant(!!document && !!document.kind, "Argument of " + document + " passed to parser was not a valid GraphQL " +
            "DocumentNode. You may need to use 'graphql-tag' or another method " +
            "to convert your operation into a document");
        var fragments = document.definitions.filter(function (x) { return x.kind === 'FragmentDefinition'; });
        var queries = document.definitions.filter(function (x) {
            return x.kind === 'OperationDefinition' && x.operation === 'query';
        });
        var mutations = document.definitions.filter(function (x) {
            return x.kind === 'OperationDefinition' && x.operation === 'mutation';
        });
        var subscriptions = document.definitions.filter(function (x) {
            return x.kind === 'OperationDefinition' && x.operation === 'subscription';
        });
        process.env.NODE_ENV === "production" ? tsInvariant.invariant(!fragments.length ||
            (queries.length || mutations.length || subscriptions.length)) : tsInvariant.invariant(!fragments.length ||
            (queries.length || mutations.length || subscriptions.length), "Passing only a fragment to 'graphql' is not yet supported. " +
            "You must include a query, subscription or mutation as well");
        process.env.NODE_ENV === "production" ? tsInvariant.invariant(queries.length + mutations.length + subscriptions.length <= 1) : tsInvariant.invariant(queries.length + mutations.length + subscriptions.length <= 1, "react-apollo only supports a query, subscription, or a mutation per HOC. " +
            (document + " had " + queries.length + " queries, " + subscriptions.length + " ") +
            ("subscriptions and " + mutations.length + " mutations. ") +
            "You can use 'compose' to join multiple operation types to a component");
        type = queries.length ? exports.DocumentType.Query : exports.DocumentType.Mutation;
        if (!queries.length && !mutations.length)
            type = exports.DocumentType.Subscription;
        var definitions = queries.length
            ? queries
            : mutations.length
                ? mutations
                : subscriptions;
        process.env.NODE_ENV === "production" ? tsInvariant.invariant(definitions.length === 1) : tsInvariant.invariant(definitions.length === 1, "react-apollo only supports one definition per HOC. " + document + " had " +
            (definitions.length + " definitions. ") +
            "You can use 'compose' to join multiple operation types to a component");
        var definition = definitions[0];
        variables = definition.variableDefinitions || [];
        if (definition.name && definition.name.kind === 'Name') {
            name = definition.name.value;
        }
        else {
            name = 'data';
        }
        var payload = { name: name, type: type, variables: variables };
        cache.set(document, payload);
        return payload;
    }

    exports.ApolloConsumer = ApolloConsumer;
    exports.ApolloProvider = ApolloProvider;
    exports.getApolloContext = getApolloContext;
    exports.parser = parser;
    exports.resetApolloContext = resetApolloContext;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
