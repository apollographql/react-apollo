"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var hoist_non_react_statics_1 = tslib_1.__importDefault(require("hoist-non-react-statics"));
var react_common_1 = require("@apollo/react-common");
var react_components_1 = require("@apollo/react-components");
var hoc_utils_1 = require("./hoc-utils");
function withSubscription(document, operationOptions) {
    if (operationOptions === void 0) { operationOptions = {}; }
    var operation = react_common_1.parser(document);
    var _a = operationOptions.options, options = _a === void 0 ? hoc_utils_1.defaultMapPropsToOptions : _a, _b = operationOptions.skip, skip = _b === void 0 ? hoc_utils_1.defaultMapPropsToSkip : _b, _c = operationOptions.alias, alias = _c === void 0 ? 'Apollo' : _c, shouldResubscribe = operationOptions.shouldResubscribe;
    var mapPropsToOptions = options;
    if (typeof mapPropsToOptions !== 'function')
        mapPropsToOptions = function () { return options; };
    var mapPropsToSkip = skip;
    if (typeof mapPropsToSkip !== 'function')
        mapPropsToSkip = function () { return skip; };
    var lastResultProps;
    return function (WrappedComponent) {
        var graphQLDisplayName = alias + "(" + hoc_utils_1.getDisplayName(WrappedComponent) + ")";
        var GraphQL = (function (_super) {
            tslib_1.__extends(GraphQL, _super);
            function GraphQL(props) {
                var _this = _super.call(this, props) || this;
                _this.state = { resubscribe: false };
                return _this;
            }
            GraphQL.prototype.componentWillReceiveProps = function (nextProps) {
                if (!shouldResubscribe)
                    return;
                this.setState({
                    resubscribe: shouldResubscribe(this.props, nextProps),
                });
            };
            GraphQL.prototype.render = function () {
                var _this = this;
                var props = this.props;
                var shouldSkip = mapPropsToSkip(props);
                var opts = shouldSkip
                    ? Object.create(null)
                    : mapPropsToOptions(props);
                if (!shouldSkip && !opts.variables && operation.variables.length > 0) {
                    opts.variables = hoc_utils_1.calculateVariablesFromProps(operation, props);
                }
                return (react_1.default.createElement(react_components_1.Subscription, tslib_1.__assign({}, opts, { displayName: graphQLDisplayName, skip: shouldSkip, subscription: document, shouldResubscribe: this.state.resubscribe }), function (_a) {
                    var _b, _c;
                    var data = _a.data, r = tslib_1.__rest(_a, ["data"]);
                    if (operationOptions.withRef) {
                        _this.withRef = true;
                        props = Object.assign({}, props, {
                            ref: _this.setWrappedInstance,
                        });
                    }
                    if (shouldSkip) {
                        return (react_1.default.createElement(WrappedComponent, tslib_1.__assign({}, props, {})));
                    }
                    var result = Object.assign(r, data || {});
                    var name = operationOptions.name || 'data';
                    var childProps = (_b = {}, _b[name] = result, _b);
                    if (operationOptions.props) {
                        var newResult = (_c = {},
                            _c[name] = result,
                            _c.ownProps = props,
                            _c);
                        lastResultProps = operationOptions.props(newResult, lastResultProps);
                        childProps = lastResultProps;
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
exports.withSubscription = withSubscription;
//# sourceMappingURL=subscription-hoc.js.map