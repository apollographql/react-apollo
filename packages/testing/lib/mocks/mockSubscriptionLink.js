import * as tslib_1 from "tslib";
import { ApolloLink, Observable, } from 'apollo-link';
var MockSubscriptionLink = (function (_super) {
    tslib_1.__extends(MockSubscriptionLink, _super);
    function MockSubscriptionLink() {
        var _this = _super.call(this) || this;
        _this.unsubscribers = [];
        _this.setups = [];
        return _this;
    }
    MockSubscriptionLink.prototype.request = function (_req) {
        var _this = this;
        return new Observable(function (observer) {
            _this.setups.forEach(function (x) { return x(); });
            _this.observer = observer;
            return function () {
                _this.unsubscribers.forEach(function (x) { return x(); });
            };
        });
    };
    MockSubscriptionLink.prototype.simulateResult = function (result, complete) {
        var _this = this;
        if (complete === void 0) { complete = false; }
        setTimeout(function () {
            var observer = _this.observer;
            if (!observer)
                throw new Error('subscription torn down');
            if (complete && observer.complete)
                observer.complete();
            if (result.result && observer.next)
                observer.next(result.result);
            if (result.error && observer.error)
                observer.error(result.error);
        }, result.delay || 0);
    };
    MockSubscriptionLink.prototype.onSetup = function (listener) {
        this.setups = this.setups.concat([listener]);
    };
    MockSubscriptionLink.prototype.onUnsubscribe = function (listener) {
        this.unsubscribers = this.unsubscribers.concat([listener]);
    };
    return MockSubscriptionLink;
}(ApolloLink));
export { MockSubscriptionLink };
export function mockObservableLink() {
    return new MockSubscriptionLink();
}
//# sourceMappingURL=mockSubscriptionLink.js.map