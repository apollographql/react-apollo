"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_common_1 = require("@apollo/react-common");
var query_hoc_1 = require("./query-hoc");
var mutation_hoc_1 = require("./mutation-hoc");
var subscription_hoc_1 = require("./subscription-hoc");
function graphql(document, operationOptions) {
    if (operationOptions === void 0) { operationOptions = {}; }
    switch (react_common_1.parser(document).type) {
        case react_common_1.DocumentType.Mutation:
            return mutation_hoc_1.withMutation(document, operationOptions);
        case react_common_1.DocumentType.Subscription:
            return subscription_hoc_1.withSubscription(document, operationOptions);
        case react_common_1.DocumentType.Query:
        default:
            return query_hoc_1.withQuery(document, operationOptions);
    }
}
exports.graphql = graphql;
//# sourceMappingURL=graphql.js.map