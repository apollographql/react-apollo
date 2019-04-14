"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var ts_invariant_1 = require("ts-invariant");
exports.defaultMapPropsToOptions = function () { return ({}); };
exports.defaultMapResultToProps = function (props) { return props; };
exports.defaultMapPropsToSkip = function () { return false; };
function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
exports.getDisplayName = getDisplayName;
function calculateVariablesFromProps(operation, props) {
    var variables = {};
    for (var _i = 0, _a = operation.variables; _i < _a.length; _i++) {
        var _b = _a[_i], variable = _b.variable, type = _b.type;
        if (!variable.name || !variable.name.value)
            continue;
        var variableName = variable.name.value;
        var variableProp = props[variableName];
        if (typeof variableProp !== 'undefined') {
            variables[variableName] = variableProp;
            continue;
        }
        if (type.kind !== 'NonNullType') {
            variables[variableName] = null;
        }
    }
    return variables;
}
exports.calculateVariablesFromProps = calculateVariablesFromProps;
var GraphQLBase = (function (_super) {
    tslib_1.__extends(GraphQLBase, _super);
    function GraphQLBase(props) {
        var _this = _super.call(this, props) || this;
        _this.withRef = false;
        _this.setWrappedInstance = _this.setWrappedInstance.bind(_this);
        return _this;
    }
    GraphQLBase.prototype.getWrappedInstance = function () {
        ts_invariant_1.invariant(this.withRef, "To access the wrapped instance, you need to specify " +
            "{ withRef: true } in the options");
        return this.wrappedInstance;
    };
    GraphQLBase.prototype.setWrappedInstance = function (ref) {
        this.wrappedInstance = ref;
    };
    return GraphQLBase;
}(react_1.default.Component));
exports.GraphQLBase = GraphQLBase;
//# sourceMappingURL=hoc-utils.js.map