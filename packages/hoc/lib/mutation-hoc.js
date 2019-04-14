"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var hoist_non_react_statics_1 = tslib_1.__importDefault(require("hoist-non-react-statics"));
var react_common_1 = require("@apollo/react-common");
var react_components_1 = require("@apollo/react-components");
var hoc_utils_1 = require("./hoc-utils");
function withMutation(document, operationOptions) {
    if (operationOptions === void 0) { operationOptions = {}; }
    var operation = react_common_1.parser(document);
    var _a = operationOptions.options, options = _a === void 0 ? hoc_utils_1.defaultMapPropsToOptions : _a, _b = operationOptions.alias, alias = _b === void 0 ? 'Apollo' : _b;
    var mapPropsToOptions = options;
    if (typeof mapPropsToOptions !== 'function')
        mapPropsToOptions = function () { return options; };
    return function (WrappedComponent) {
        var graphQLDisplayName = alias + "(" + hoc_utils_1.getDisplayName(WrappedComponent) + ")";
        var GraphQL = (function (_super) {
            tslib_1.__extends(GraphQL, _super);
            function GraphQL() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            GraphQL.prototype.render = function () {
                var props = this.props;
                var opts = mapPropsToOptions(props);
                if (operationOptions.withRef) {
                    this.withRef = true;
                    props = Object.assign({}, props, {
                        ref: this.setWrappedInstance,
                    });
                }
                if (!opts.variables && operation.variables.length > 0) {
                    opts.variables = hoc_utils_1.calculateVariablesFromProps(operation, props);
                }
                return (react_1.default.createElement(react_components_1.Mutation, tslib_1.__assign({}, opts, { mutation: document, ignoreResults: true }), function (mutate, _result) {
                    var _a, _b;
                    var name = operationOptions.name || 'mutate';
                    var childProps = (_a = {}, _a[name] = mutate, _a);
                    if (operationOptions.props) {
                        var newResult = (_b = {},
                            _b[name] = mutate,
                            _b.ownProps = props,
                            _b);
                        childProps = operationOptions.props(newResult);
                    }
                    return (react_1.default.createElement(WrappedComponent, tslib_1.__assign({}, props, childProps)));
                }));
            };
            GraphQL.displayName = graphQLDisplayName;
            GraphQL.WrappedComponent = WrappedComponent;
            return GraphQL;
        }(hoc_utils_1.GraphQLBase));
        return hoist_non_react_statics_1.default(GraphQL, WrappedComponent, {});
    };
}
exports.withMutation = withMutation;
//# sourceMappingURL=mutation-hoc.js.map