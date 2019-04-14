import * as tslib_1 from "tslib";
import React from 'react';
import PropTypes from 'prop-types';
import { getApolloContext } from '@apollo/react-common';
import { getClient } from './utils/getClient';
import shallowEqual from './utils/shallowEqual';
var Subscription = (function (_super) {
    tslib_1.__extends(Subscription, _super);
    function Subscription(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.initialize = function (props) {
            if (_this.observableQuery)
                return;
            _this.observableQuery = _this.client.subscribe({
                query: props.subscription,
                variables: props.variables,
                fetchPolicy: props.fetchPolicy,
            });
        };
        _this.startSubscription = function () {
            if (_this.observableQuerySubscription)
                return;
            _this.observableQuerySubscription = _this.observableQuery.subscribe({
                next: _this.updateCurrentData,
                error: _this.updateError,
                complete: _this.completeSubscription,
            });
        };
        _this.getInitialState = function () { return ({
            loading: true,
            error: undefined,
            data: undefined,
        }); };
        _this.updateCurrentData = function (result) {
            var onSubscriptionData = _this.props.onSubscriptionData;
            if (onSubscriptionData) {
                onSubscriptionData({
                    client: _this.client,
                    subscriptionData: result,
                });
            }
            _this.setState({
                data: result.data,
                loading: false,
                error: undefined,
            }, function () {
                delete _this.previousState;
            });
        };
        _this.updateError = function (error) {
            _this.setState({
                error: error,
                loading: false,
            });
        };
        _this.completeSubscription = function () {
            var onSubscriptionComplete = _this.props.onSubscriptionComplete;
            if (onSubscriptionComplete)
                onSubscriptionComplete();
            _this.endSubscription();
        };
        _this.endSubscription = function () {
            if (_this.observableQuerySubscription) {
                _this.observableQuerySubscription.unsubscribe();
                delete _this.observableQuerySubscription;
            }
        };
        _this.newClient = function () {
            var clientChanged = false;
            var client = getClient(_this.props, _this.context);
            if (client !== _this.client) {
                clientChanged = true;
                _this.client = client;
                _this.endSubscription();
                delete _this.observableQuery;
            }
            return clientChanged;
        };
        _this.client = getClient(props, context);
        _this.initialize(props);
        _this.state = _this.getInitialState();
        return _this;
    }
    Subscription.prototype.componentDidMount = function () {
        this.startSubscription();
    };
    Subscription.prototype.componentWillUnmount = function () {
        this.endSubscription();
    };
    Subscription.prototype.render = function () {
        var currentState = this.state;
        if (this.newClient()) {
            currentState = this.getInitialState();
        }
        var shouldResubscribe = this.props.shouldResubscribe;
        if (typeof shouldResubscribe === 'function') {
            shouldResubscribe = !!shouldResubscribe(this.props);
        }
        if (shouldResubscribe !== false &&
            this.previousProps &&
            (!shallowEqual(this.previousProps.variables, this.props.variables) ||
                this.previousProps.subscription !== this.props.subscription)) {
            this.endSubscription();
            delete this.observableQuery;
            if (!this.previousState) {
                currentState = this.getInitialState();
            }
        }
        this.initialize(this.props);
        this.startSubscription();
        var renderFn = this.props.children;
        if (!renderFn)
            return null;
        var result = tslib_1.__assign({}, currentState, { variables: this.props.variables });
        this.previousState = currentState;
        this.previousProps = this.props;
        return renderFn(result);
    };
    Subscription.contextType = getApolloContext();
    Subscription.propTypes = {
        subscription: PropTypes.object.isRequired,
        variables: PropTypes.object,
        children: PropTypes.func,
        onSubscriptionData: PropTypes.func,
        onSubscriptionComplete: PropTypes.func,
        shouldResubscribe: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
    };
    return Subscription;
}(React.Component));
export { Subscription };
//# sourceMappingURL=Subscription.js.map