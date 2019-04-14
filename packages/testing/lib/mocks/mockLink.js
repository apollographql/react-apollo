import * as tslib_1 from "tslib";
import { ApolloLink, Observable, } from 'apollo-link';
import { addTypenameToDocument, removeClientSetsFromDocument, removeConnectionDirectiveFromDocument, cloneDeep, } from 'apollo-utilities';
import { print } from 'graphql/language/printer';
import isEqual from 'lodash.isequal';
function requestToKey(request, addTypename) {
    var queryString = request.query &&
        print(addTypename ? addTypenameToDocument(request.query) : request.query);
    var requestKey = { query: queryString };
    return JSON.stringify(requestKey);
}
var MockLink = (function (_super) {
    tslib_1.__extends(MockLink, _super);
    function MockLink(mockedResponses, addTypename) {
        if (addTypename === void 0) { addTypename = true; }
        var _this = _super.call(this) || this;
        _this.addTypename = true;
        _this.mockedResponsesByKey = {};
        _this.addTypename = addTypename;
        if (mockedResponses)
            mockedResponses.forEach(function (mockedResponse) {
                _this.addMockedResponse(mockedResponse);
            });
        return _this;
    }
    MockLink.prototype.addMockedResponse = function (mockedResponse) {
        var normalizedMockedResponse = this.normalizeMockedResponse(mockedResponse);
        var key = requestToKey(normalizedMockedResponse.request, this.addTypename);
        var mockedResponses = this.mockedResponsesByKey[key];
        if (!mockedResponses) {
            mockedResponses = [];
            this.mockedResponsesByKey[key] = mockedResponses;
        }
        mockedResponses.push(normalizedMockedResponse);
    };
    MockLink.prototype.request = function (operation) {
        var key = requestToKey(operation, this.addTypename);
        var responseIndex;
        var response = (this.mockedResponsesByKey[key] || []).find(function (res, index) {
            var requestVariables = operation.variables || {};
            var mockedResponseVariables = res.request.variables || {};
            if (!isEqual(requestVariables, mockedResponseVariables)) {
                return false;
            }
            responseIndex = index;
            return true;
        });
        if (!response || typeof responseIndex === 'undefined') {
            throw new Error("No more mocked responses for the query: " + print(operation.query) + ", variables: " + JSON.stringify(operation.variables));
        }
        this.mockedResponsesByKey[key].splice(responseIndex, 1);
        var result = response.result, error = response.error, delay = response.delay, newData = response.newData;
        if (newData) {
            response.result = newData();
            this.mockedResponsesByKey[key].push(response);
        }
        if (!result && !error) {
            throw new Error("Mocked response should contain either result or error: " + key);
        }
        return new Observable(function (observer) {
            var timer = setTimeout(function () {
                if (error) {
                    observer.error(error);
                }
                else {
                    if (result) {
                        observer.next(typeof result === 'function'
                            ? result()
                            : result);
                    }
                    observer.complete();
                }
            }, delay ? delay : 0);
            return function () {
                clearTimeout(timer);
            };
        });
    };
    MockLink.prototype.normalizeMockedResponse = function (mockedResponse) {
        var newMockedResponse = cloneDeep(mockedResponse);
        newMockedResponse.request.query = removeConnectionDirectiveFromDocument(newMockedResponse.request.query);
        var query = removeClientSetsFromDocument(newMockedResponse.request.query);
        if (query) {
            newMockedResponse.request.query = query;
        }
        return newMockedResponse;
    };
    return MockLink;
}(ApolloLink));
export { MockLink };
export function mockSingleLink() {
    var mockedResponses = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        mockedResponses[_i] = arguments[_i];
    }
    var maybeTypename = mockedResponses[mockedResponses.length - 1];
    var mocks = mockedResponses.slice(0, mockedResponses.length - 1);
    if (typeof maybeTypename !== 'boolean') {
        mocks = mockedResponses;
        maybeTypename = true;
    }
    return new MockLink(mocks, maybeTypename);
}
//# sourceMappingURL=mockLink.js.map