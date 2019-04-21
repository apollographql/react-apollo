import { getApolloContext, parser, DocumentType } from '@apollo/react-common';
export { ApolloConsumer, ApolloProvider, getApolloContext, resetApolloContext } from '@apollo/react-common';
import { __extends, __assign, __rest } from 'tslib';
import React from 'react';
import PropTypes from 'prop-types';
import { NetworkStatus, ApolloError } from 'apollo-client';
import { invariant } from 'ts-invariant';
import 'fast-json-stable-stringify';

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

function isEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    if (a != null &&
        typeof a === 'object' &&
        b != null &&
        typeof b === 'object') {
        for (var key in a) {
            if (Object.prototype.hasOwnProperty.call(a, key)) {
                if (!Object.prototype.hasOwnProperty.call(b, key)) {
                    return false;
                }
                if (!isEqual(a[key], b[key])) {
                    return false;
                }
            }
        }
        for (var key in b) {
            if (Object.prototype.hasOwnProperty.call(b, key) &&
                !Object.prototype.hasOwnProperty.call(a, key)) {
                return false;
            }
        }
        return true;
    }
    return false;
}

function getClient(props, context) {
    var client = props.client || context.client;
    process.env.NODE_ENV === "production" ? invariant(!!client) : invariant(!!client, 'Could not find "client" in the context or passed in as a prop. ' +
        'Wrap the root component in an <ApolloProvider>, or pass an ' +
        'ApolloClient instance in via props.');
    return client;
}

var hasOwnProperty = Object.prototype.hasOwnProperty;
function is(x, y) {
    if (x === y) {
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    }
    return x !== x && y !== y;
}
function isObject(obj) {
    return obj !== null && typeof obj === "object";
}
function shallowEqual(objA, objB) {
    if (is(objA, objB)) {
        return true;
    }
    if (!isObject(objA) || !isObject(objB)) {
        return false;
    }
    var keys = Object.keys(objA);
    if (keys.length !== Object.keys(objB).length) {
        return false;
    }
    return keys.every(function (key) { return hasOwnProperty.call(objB, key) && is(objA[key], objB[key]); });
}

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
    __extends(Query, _super);
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
                result = __assign({}, result, { data: undefined, error: undefined, loading: false });
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
        var _a = this.props, children = _a.children, ssr = _a.ssr, displayName = _a.displayName, skip = _a.skip, onCompleted = _a.onCompleted, onError = _a.onError, partialRefetch = _a.partialRefetch, opts = __rest(_a, ["children", "ssr", "displayName", "skip", "onCompleted", "onError", "partialRefetch"]);
        var fetchPolicy = opts.fetchPolicy;
        if (ssr === false)
            return false;
        if (fetchPolicy === 'network-only' || fetchPolicy === 'cache-and-network') {
            fetchPolicy = 'cache-first';
        }
        var observable = client.watchQuery(__assign({}, opts, { fetchPolicy: fetchPolicy }));
        if (context && context.renderPromises) {
            context.renderPromises.registerSSRObservable(this, observable);
        }
        var result = this.observableQuery.getCurrentResult();
        return result.loading ? observable.result() : false;
    };
    Query.prototype.extractOptsFromProps = function (props) {
        this.operation = parser(props.query);
        process.env.NODE_ENV === "production" ? invariant(this.operation.type === DocumentType.Query) : invariant(this.operation.type === DocumentType.Query, "The <Query /> component requires a graphql query, but got a " + (this.operation.type === DocumentType.Mutation
            ? 'mutation'
            : 'subscription') + ".");
        var displayName = props.displayName || 'Query';
        return __assign({}, props, { displayName: displayName, context: props.context || {}, metadata: { reactComponent: { displayName: displayName } } });
    };
    Query.prototype.initializeObservableQuery = function (client, props, context) {
        if (context && context.renderPromises) {
            this.observableQuery = context.renderPromises.getSSRObservable(this);
        }
        if (!this.observableQuery) {
            var options = this.extractOptsFromProps(props);
            this.previousOptions = __assign({}, options, { children: null });
            this.observableQuery = client.watchQuery(options);
        }
    };
    Query.prototype.updateObservableQuery = function (client, context) {
        if (!this.observableQuery) {
            this.initializeObservableQuery(client, this.props, context);
        }
        var newOptions = __assign({}, this.extractOptsFromProps(this.props), { children: null });
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

var Mutation = (function (_super) {
    __extends(Mutation, _super);
    function Mutation(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.hasMounted = false;
        _this.runMutation = function (options) {
            if (options === void 0) { options = {}; }
            _this.onMutationStart();
            var mutationId = _this.generateNewMutationId();
            return _this.mutate(options)
                .then(function (response) {
                _this.onMutationCompleted(response, mutationId);
                return response;
            })
                .catch(function (e) {
                _this.onMutationError(e, mutationId);
                if (!_this.props.onError)
                    throw e;
            });
        };
        _this.mutate = function (options) {
            var _a = _this.props, mutation = _a.mutation, variables = _a.variables, optimisticResponse = _a.optimisticResponse, update = _a.update, _b = _a.context, context = _b === void 0 ? {} : _b, _c = _a.awaitRefetchQueries, awaitRefetchQueries = _c === void 0 ? false : _c, fetchPolicy = _a.fetchPolicy;
            var mutateOptions = __assign({}, options);
            var refetchQueries = mutateOptions.refetchQueries || _this.props.refetchQueries;
            var mutateVariables = Object.assign({}, variables, mutateOptions.variables);
            delete mutateOptions.variables;
            return _this.currentClient().mutate(__assign({ mutation: mutation,
                optimisticResponse: optimisticResponse,
                refetchQueries: refetchQueries,
                awaitRefetchQueries: awaitRefetchQueries,
                update: update,
                context: context,
                fetchPolicy: fetchPolicy, variables: mutateVariables }, mutateOptions));
        };
        _this.onMutationStart = function () {
            if (!_this.state.loading && !_this.props.ignoreResults) {
                _this.setState({
                    loading: true,
                    error: undefined,
                    data: undefined,
                    called: true,
                });
            }
        };
        _this.onMutationCompleted = function (response, mutationId) {
            var _a = _this.props, onCompleted = _a.onCompleted, ignoreResults = _a.ignoreResults;
            var data = response.data, errors = response.errors;
            var error = errors && errors.length > 0
                ? new ApolloError({ graphQLErrors: errors })
                : undefined;
            var callOncomplete = function () {
                return onCompleted ? onCompleted(data) : null;
            };
            if (_this.hasMounted &&
                _this.isMostRecentMutation(mutationId) &&
                !ignoreResults) {
                _this.setState({ loading: false, data: data, error: error }, callOncomplete);
            }
            else {
                callOncomplete();
            }
        };
        _this.onMutationError = function (error, mutationId) {
            var onError = _this.props.onError;
            var callOnError = function () { return (onError ? onError(error) : null); };
            if (_this.hasMounted && _this.isMostRecentMutation(mutationId)) {
                _this.setState({ loading: false, error: error }, callOnError);
            }
            else {
                callOnError();
            }
        };
        _this.generateNewMutationId = function () {
            _this.mostRecentMutationId = _this.mostRecentMutationId + 1;
            return _this.mostRecentMutationId;
        };
        _this.isMostRecentMutation = function (mutationId) {
            return _this.mostRecentMutationId === mutationId;
        };
        _this.verifyDocumentIsMutation = function (mutation) {
            var operation = parser(mutation);
            process.env.NODE_ENV === "production" ? invariant(operation.type === DocumentType.Mutation) : invariant(operation.type === DocumentType.Mutation, "The <Mutation /> component requires a graphql mutation, but got a " + (operation.type === DocumentType.Query ? 'query' : 'subscription') + ".");
        };
        _this.verifyDocumentIsMutation(props.mutation);
        _this.mostRecentMutationId = 0;
        _this.state = {
            called: false,
            loading: false,
        };
        return _this;
    }
    Mutation.prototype.componentDidMount = function () {
        this.hasMounted = true;
    };
    Mutation.prototype.componentDidUpdate = function (prevProps) {
        if (this.props.mutation !== prevProps.mutation) {
            this.verifyDocumentIsMutation(this.props.mutation);
        }
    };
    Mutation.prototype.componentWillUnmount = function () {
        this.hasMounted = false;
    };
    Mutation.prototype.render = function () {
        var children = this.props.children;
        var _a = this.state, loading = _a.loading, data = _a.data, error = _a.error, called = _a.called;
        var result = {
            called: called,
            loading: loading,
            data: data,
            error: error,
            client: this.currentClient(),
        };
        return children(this.runMutation, result);
    };
    Mutation.prototype.currentClient = function () {
        return getClient(this.props, this.context);
    };
    Mutation.contextType = getApolloContext();
    Mutation.propTypes = {
        mutation: PropTypes.object.isRequired,
        variables: PropTypes.object,
        optimisticResponse: PropTypes.object,
        refetchQueries: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
            PropTypes.func,
        ]),
        awaitRefetchQueries: PropTypes.bool,
        update: PropTypes.func,
        children: PropTypes.func.isRequired,
        onCompleted: PropTypes.func,
        onError: PropTypes.func,
        fetchPolicy: PropTypes.string,
    };
    return Mutation;
}(React.Component));

var Subscription = (function (_super) {
    __extends(Subscription, _super);
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
        var result = __assign({}, currentState, { variables: this.props.variables });
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

function makeDefaultQueryInfo() {
    return {
        seen: false,
        observable: null,
    };
}
var RenderPromises = (function () {
    function RenderPromises() {
        this.queryPromises = new Map();
        this.queryInfoTrie = new Map();
    }
    RenderPromises.prototype.registerSSRObservable = function (queryInstance, observable) {
        this.lookupQueryInfo(queryInstance).observable = observable;
    };
    RenderPromises.prototype.getSSRObservable = function (queryInstance) {
        return this.lookupQueryInfo(queryInstance).observable;
    };
    RenderPromises.prototype.addQueryPromise = function (queryInstance, finish, client, context) {
        var info = this.lookupQueryInfo(queryInstance);
        if (!info.seen) {
            this.queryPromises.set(queryInstance, new Promise(function (resolve) {
                resolve(queryInstance.fetchData(client, context));
            }));
            return null;
        }
        return finish();
    };
    RenderPromises.prototype.hasPromises = function () {
        return this.queryPromises.size > 0;
    };
    RenderPromises.prototype.consumeAndAwaitPromises = function () {
        var _this = this;
        var promises = [];
        this.queryPromises.forEach(function (promise, queryInstance) {
            _this.lookupQueryInfo(queryInstance).seen = true;
            promises.push(promise);
        });
        this.queryPromises.clear();
        return Promise.all(promises);
    };
    RenderPromises.prototype.lookupQueryInfo = function (queryInstance) {
        var queryInfoTrie = this.queryInfoTrie;
        var _a = queryInstance.props, query = _a.query, variables = _a.variables;
        var varMap = queryInfoTrie.get(query) || new Map();
        if (!queryInfoTrie.has(query))
            queryInfoTrie.set(query, varMap);
        var variablesString = JSON.stringify(variables);
        var info = varMap.get(variablesString) || makeDefaultQueryInfo();
        if (!varMap.has(variablesString))
            varMap.set(variablesString, info);
        return info;
    };
    return RenderPromises;
}());
function getDataFromTree(tree, context) {
    if (context === void 0) { context = {}; }
    return getMarkupFromTree({
        tree: tree,
        context: context,
        renderFunction: require('react-dom/server').renderToStaticMarkup,
    });
}
function getMarkupFromTree(_a) {
    var tree = _a.tree, _b = _a.context, context = _b === void 0 ? {} : _b, _c = _a.renderFunction, renderFunction = _c === void 0 ? require('react-dom/server').renderToStaticMarkup : _c;
    var renderPromises = new RenderPromises();
    function process() {
        var ApolloContext = getApolloContext();
        var html = renderFunction(React.createElement(ApolloContext.Provider, { value: __assign({}, context, { renderPromises: renderPromises }) }, tree));
        return renderPromises.hasPromises()
            ? renderPromises.consumeAndAwaitPromises().then(process)
            : html;
    }
    return Promise.resolve().then(process);
}

function renderToStringWithData(component) {
    return getMarkupFromTree({
        tree: component,
        renderFunction: require('react-dom/server').renderToString,
    });
}

function useApolloClient() {
    var client = React.useContext(getApolloContext()).client;
    process.env.NODE_ENV === "production" ? invariant(!client) : invariant(!client, 'No Apollo Client instance can be found. Please ensure that you ' +
        'have called `ApolloProvider` higher up in your tree.');
    return client;
}

export { Mutation, Query, RenderPromises, Subscription, getDataFromTree, getMarkupFromTree, renderToStringWithData, useApolloClient };
//# sourceMappingURL=react-components.esm.js.map
