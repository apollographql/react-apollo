import * as tslib_1 from "tslib";
import React from 'react';
import PropTypes from 'prop-types';
import { ApolloError, } from 'apollo-client';
import { invariant } from 'ts-invariant';
import { getApolloContext, parser, DocumentType, } from '@apollo/react-common';
import { getClient } from './utils/getClient';
var Mutation = (function (_super) {
    tslib_1.__extends(Mutation, _super);
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
            var mutateOptions = tslib_1.__assign({}, options);
            var refetchQueries = mutateOptions.refetchQueries || _this.props.refetchQueries;
            var mutateVariables = Object.assign({}, variables, mutateOptions.variables);
            delete mutateOptions.variables;
            return _this.currentClient().mutate(tslib_1.__assign({ mutation: mutation,
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
            invariant(operation.type === DocumentType.Mutation, "The <Mutation /> component requires a graphql mutation, but got a " + (operation.type === DocumentType.Query ? 'query' : 'subscription') + ".");
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
export { Mutation };
//# sourceMappingURL=Mutation.js.map