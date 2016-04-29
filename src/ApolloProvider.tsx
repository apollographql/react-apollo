/// <reference path="../typings/main.d.ts" />
/* tslint:disable:no-unused-variable */
import * as React from 'react';
/* tslint:enable:no-unused-variable */
import {
    Component,
    PropTypes,
} from 'react';

import {
    Provider,
} from 'react-redux';

import {
    Store,
} from 'redux';


import ApolloClient from 'apollo-client';

export declare interface ProviderProps {
    store: Store<any>;
    client: ApolloClient;
}

export default class ApolloProvider extends Component<ProviderProps, any> {
    static propTypes = {
        store: PropTypes.shape({
            subscribe: PropTypes.func.isRequired,
            dispatch: PropTypes.func.isRequired,
            getState: PropTypes.func.isRequired,
        }),
        client: PropTypes.object.isRequired,
        children: PropTypes.element.isRequired,
    };

    static childContextTypes = {
        client: PropTypes.object.isRequired,
    };

    public store: Store<any>;
    public client: ApolloClient;

    getChildContext() {
        const { client } = this.props;
        return {
            client,
        };
    }

    render() {
        const { store, children } = this.props;
        return (
            <Provider store={store}>
                {children}
            </Provider>
        );
    }

}
