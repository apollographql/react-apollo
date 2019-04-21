import * as tslib_1 from "tslib";
import React from 'react';
import PropTypes from 'prop-types';
import { ApolloError, NetworkStatus, } from 'apollo-client';
import { isEqual } from 'apollo-utilities';
import { getApolloContext, parser, DocumentType, } from '@apollo/react-common';
import { invariant } from 'ts-invariant';
import { getClient } from './utils/getClient';
import shallowEqual from './utils/shallowEqual';
function observableQueryFields(observable) {
    var fields = {
        variables: observable.variables,
        refetch: observable.refetch.bind(observable),
        fetchMore: observable.fetchMore.bind(observable),
        updateQuery: observable.updateQuery.bind(observable),
        startPolling: observable.startPolling.bind(observable),
        stopPolling: observable.stopPolling.bind(observable),
        subscribeToMore: observable.subscribeToMore.bind(observable),
    };
    return fields;
}
var Query = (function (_super) {
    tslib_1.__extends(Query, _super);
    function Query() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.hasMounted = false;
        _this.previousOptions = null;
        _this.previousResult = null;
        _this.startQuerySubscription = function (client) {
            if (_this.observableQuerySubscription)
                return;
            _this.observableQuerySubscription = _this.observableQuery.subscribe({
                next: function (_a) {
                    var loading = _a.loading, networkStatus = _a.networkStatus, data = _a.data;
                    var previousResult = _this.previousResult;
                    if (previousResult &&
                        previousResult.loading === loading &&
                        previousResult.networkStatus === networkStatus &&
                        shallowEqual(previousResult.data, data || {})) {
                        return;
                    }
                    _this.updateCurrentData();
                },
                error: function (error) {
                    var previousResult = _this.previousResult;
                    if (!previousResult ||
                        previousResult.networkStatus === NetworkStatus.refetch) {
                        _this.resubscribeToQuery(client);
                    }
                    if (!error.hasOwnProperty('graphQLErrors'))
                        throw error;
                    _this.updateCurrentData();
                },
            });
        };
        _this.removeQuerySubscription = function () {
            if (_this.observableQuerySubscription) {
                _this.observableQuerySubscription.unsubscribe();
                delete _this.observableQuerySubscription;
            }
        };
        _this.updateCurrentData = function () {
            _this.handleErrorOrCompleted();
            if (_this.hasMounted)
                _this.forceUpdate();
        };
        _this.handleErrorOrCompleted = function () {
            var result = _this.observableQuery.getCurrentResult();
            var data = result.data, loading = result.loading, error = result.error;
            var _a = _this.props, onCompleted = _a.onCompleted, onError = _a.onError;
            if (onCompleted && !loading && !error) {
                onCompleted(data);
            }
            else if (onError && !loading && error) {
                onError(error);
            }
        };
        _this.getQueryResult = function (client) {
            var result = {
                data: Object.create(null),
            };
            Object.assign(result, observableQueryFields(_this.observableQuery));
            if (_this.props.skip) {
                result = tslib_1.__assign({}, result, { data: undefined, error: undefined, loading: false });
            }
            else {
                var currentResult = _this.observableQuery.getCurrentResult();
                var loading = currentResult.loading, partial = currentResult.partial, networkStatus = currentResult.networkStatus, errors = currentResult.errors;
                var error = currentResult.error, data = currentResult.data;
                data = data || Object.create(null);
                if (errors && errors.length > 0) {
                    error = new ApolloError({ graphQLErrors: errors });
                }
                Object.assign(result, { loading: loading, networkStatus: networkStatus, error: error });
                if (loading) {
                    var previousData = _this.previousResult
                        ? _this.previousResult.data
                        : {};
                    Object.assign(result.data, previousData, data);
                }
                else if (error) {
                    Object.assign(result, {
                        data: (_this.observableQuery.getLastResult() || {}).data,
                    });
                }
                else {
                    var fetchPolicy = _this.observableQuery.options.fetchPolicy;
                    var partialRefetch = _this.props.partialRefetch;
                    if (partialRefetch &&
                        Object.keys(data).length === 0 &&
                        partial &&
                        fetchPolicy !== 'cache-only') {
                        Object.assign(result, {
                            loading: true,
                            networkStatus: NetworkStatus.loading,
                        });
                        result.refetch();
                        return result;
                    }
                    Object.assign(result.data, data);
                }
            }
            result.client = client;
            _this.previousResult = result;
            return result;
        };
        return _this;
    }
    Query.prototype.componentDidMount = function () {
        this.hasMounted = true;
    };
    Query.prototype.componentDidUpdate = function (prevProps) {
        var isDiffRequest = !isEqual(prevProps.query, this.props.query) ||
            !isEqual(prevProps.variables, this.props.variables);
        if (isDiffRequest) {
            this.handleErrorOrCompleted();
        }
    };
    Query.prototype.componentWillUnmount = function () {
        this.removeQuerySubscription();
        this.hasMounted = false;
    };
    Query.prototype.render = function () {
        var _this = this;
        var ApolloContext = getApolloContext();
        return (React.createElement(ApolloContext.Consumer, null, function (context) {
            return _this.renderData(context);
        }));
    };
    Query.prototype.fetchData = function (client, context) {
        if (this.props.skip)
            return false;
        var _a = this.props, children = _a.children, ssr = _a.ssr, displayName = _a.displayName, skip = _a.skip, onCompleted = _a.onCompleted, onError = _a.onError, partialRefetch = _a.partialRefetch, opts = tslib_1.__rest(_a, ["children", "ssr", "displayName", "skip", "onCompleted", "onError", "partialRefetch"]);
        var fetchPolicy = opts.fetchPolicy;
        if (ssr === false)
            return false;
        if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
            fetchPolicy = 'cache-first';
        }
        var observable = client.watchQuery(tslib_1.__assign({}, opts, { fetchPolicy: fetchPolicy }));
        if (context && context.renderPromises) {
            context.renderPromises.registerSSRObservable(this, observable);
        }
        var result = this.observableQuery.getCurrentResult();
        return result.loading ? observable.result() : false;
    };
    Query.prototype.extractOptsFromProps = function (props) {
        this.operation = parser(props.query);
        invariant(this.operation.type === DocumentType.Query, "The <Query /> component requires a graphql query, but got a " + (this.operation.type === DocumentType.Mutation
            ? 'mutation'
            : 'subscription') + ".");
        var displayName = props.displayName || 'Query';
        return tslib_1.__assign({}, props, { displayName: displayName, context: props.context || {}, metadata: { reactComponent: { displayName: displayName } } });
    };
    Query.prototype.initializeObservableQuery = function (client, props, context) {
        if (context && context.renderPromises) {
            this.observableQuery = context.renderPromises.getSSRObservable(this);
        }
        if (!this.observableQuery) {
            var options = this.extractOptsFromProps(props);
            this.previousOptions = tslib_1.__assign({}, options, { children: null });
            this.observableQuery = client.watchQuery(options);
        }
    };
    Query.prototype.updateObservableQuery = function (client, context) {
        if (!this.observableQuery) {
            this.initializeObservableQuery(client, this.props, context);
        }
        var newOptions = tslib_1.__assign({}, this.extractOptsFromProps(this.props), { children: null });
        if (!isEqual(newOptions, this.previousOptions)) {
            this.previousOptions = newOptions;
            this.observableQuery.setOptions(newOptions)
                .catch(function () { return null; });
        }
    };
    Query.prototype.resubscribeToQuery = function (client) {
        this.removeQuerySubscription();
        var lastError = this.observableQuery.getLastError();
        var lastResult = this.observableQuery.getLastResult();
        this.observableQuery.resetLastResults();
        this.startQuerySubscription(client);
        Object.assign(this.observableQuery, { lastError: lastError, lastResult: lastResult });
    };
    Query.prototype.currentClient = function (context) {
        var client = getClient(this.props, context);
        if (this.previousClient !== client) {
            this.previousClient = client;
            this.removeQuerySubscription();
            this.observableQuery = null;
            this.previousResult = null;
        }
        return client;
    };
    Query.prototype.renderData = function (context) {
        var _this = this;
        var client = this.currentClient(context);
        var _a = this.props, skip = _a.skip, query = _a.query;
        if (skip || query !== this.previousQuery) {
            this.removeQuerySubscription();
            this.observableQuery = null;
            this.previousQuery = query;
        }
        this.updateObservableQuery(client, context);
        if (!skip) {
            this.startQuerySubscription(client);
        }
        var finish = function () { return _this.props.children(_this.getQueryResult(client)); };
        if (context && context.renderPromises) {
            return context.renderPromises.addQueryPromise(this, finish, client, context);
        }
        return finish();
    };
    Query.propTypes = {
        client: PropTypes.object,
        children: PropTypes.func.isRequired,
        fetchPolicy: PropTypes.string,
        notifyOnNetworkStatusChange: PropTypes.bool,
        onCompleted: PropTypes.func,
        onError: PropTypes.func,
        pollInterval: PropTypes.number,
        query: PropTypes.object.isRequired,
        variables: PropTypes.object,
        ssr: PropTypes.bool,
        partialRefetch: PropTypes.bool,
    };
    return Query;
}(React.Component));
export { Query };
//# sourceMappingURL=Query.js.map