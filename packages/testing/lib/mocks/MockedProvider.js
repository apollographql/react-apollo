import * as tslib_1 from "tslib";
import React from 'react';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { ApolloProvider } from '@apollo/react-common';
import { MockLink } from './mockLink';
var MockedProvider = (function (_super) {
    tslib_1.__extends(MockedProvider, _super);
    function MockedProvider(props) {
        var _this = _super.call(this, props) || this;
        var _a = _this.props, mocks = _a.mocks, addTypename = _a.addTypename, defaultOptions = _a.defaultOptions, cache = _a.cache, resolvers = _a.resolvers;
        var client = new ApolloClient({
            cache: cache || new Cache({ addTypename: addTypename }),
            defaultOptions: defaultOptions,
            link: new MockLink(mocks || [], addTypename),
            resolvers: resolvers,
        });
        _this.state = { client: client };
        return _this;
    }
    MockedProvider.prototype.render = function () {
        var _a = this.props, children = _a.children, childProps = _a.childProps;
        return children ? (React.createElement(ApolloProvider, { client: this.state.client }, React.cloneElement(React.Children.only(children), tslib_1.__assign({}, childProps)))) : null;
    };
    MockedProvider.prototype.componentWillUnmount = function () {
        this.state.client.stop();
    };
    MockedProvider.defaultProps = {
        addTypename: true,
    };
    return MockedProvider;
}(React.Component));
export { MockedProvider };
//# sourceMappingURL=MockedProvider.js.map