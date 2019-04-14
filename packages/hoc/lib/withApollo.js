"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var react_common_1 = require("@apollo/react-common");
var hoist_non_react_statics_1 = tslib_1.__importDefault(require("hoist-non-react-statics"));
var ts_invariant_1 = require("ts-invariant");
function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
function withApollo(WrappedComponent, operationOptions) {
    if (operationOptions === void 0) { operationOptions = {}; }
    var withDisplayName = "withApollo(" + getDisplayName(WrappedComponent) + ")";
    var WithApollo = (function (_super) {
        tslib_1.__extends(WithApollo, _super);
        function WithApollo(props) {
            var _this = _super.call(this, props) || this;
            _this.setWrappedInstance = _this.setWrappedInstance.bind(_this);
            return _this;
        }
        WithApollo.prototype.getWrappedInstance = function () {
            ts_invariant_1.invariant(operationOptions.withRef, "To access the wrapped instance, you need to specify " +
                "{ withRef: true } in the options");
            return this.wrappedInstance;
        };
        WithApollo.prototype.setWrappedInstance = function (ref) {
            this.wrappedInstance = ref;
        };
        WithApollo.prototype.render = function () {
            var _this = this;
            return (react_1.default.createElement(react_common_1.ApolloConsumer, null, function (client) {
                var props = Object.assign({}, _this.props, {
                    client: client,
                    ref: operationOptions.withRef
                        ? _this.setWrappedInstance
                        : undefined,
                });
                return react_1.default.createElement(WrappedComponent, tslib_1.__assign({}, props));
            }));
        };
        WithApollo.displayName = withDisplayName;
        WithApollo.WrappedComponent = WrappedComponent;
        return WithApollo;
    }(react_1.default.Component));
    return hoist_non_react_statics_1.default(WithApollo, WrappedComponent, {});
}
exports.withApollo = withApollo;
//# sourceMappingURL=withApollo.js.map