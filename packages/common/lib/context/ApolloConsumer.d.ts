import React from 'react';
import ApolloClient from 'apollo-client';
export interface ApolloConsumerProps {
    children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}
export declare const ApolloConsumer: React.FC<ApolloConsumerProps>;
