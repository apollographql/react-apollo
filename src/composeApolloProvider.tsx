/// <reference path="../typings/main.d.ts" />
/* tslint:disable:no-unused-variable */
import * as React from 'react';
/* tslint:enable:no-unused-variable */
import {
    Component,
    PropTypes,
} from 'react';

import {
    Store,
} from 'redux';


import ApolloClient from 'apollo-client';

declare interface ProviderProps {
    store?: Store<any>;
    client: ApolloClient;
}

export default function composeApolloProvider<T>(Provider: React.ComponentClass<any>): any {
    return class WrapperProvider extends Component<ProviderProps, any> {
        /* tslint:disable:member-ordering */
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
            store: PropTypes.object.isRequired,
            client: PropTypes.object.isRequired,
        };

        public store: Store<any>;
        public client: ApolloClient;
        /* tslint:enable:member-ordering */
        constructor(props, context) {
            super(props, context);
            this.client = props.client;

            if (props.store) {
                this.store = props.store;
                return;
            }

            // intialize the built in store if none is passed in
            props.client.initStore();
            this.store = props.client.store;

        }
        getChildContext() {
            return {
                store: this.store,
                client: this.client,
            };
        }
        render() {
            const { children } = this.props;
            return (
                <Provider store={this.store}>
                    {children}
                </Provider>
            );
        }
    };
}
