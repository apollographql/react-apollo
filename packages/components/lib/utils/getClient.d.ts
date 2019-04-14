import ApolloClient from 'apollo-client';
import { ApolloContextValue } from '@apollo/react-common';
export interface CommonComponentProps {
    client?: ApolloClient<Object>;
}
export declare function getClient(props: CommonComponentProps, context: ApolloContextValue): ApolloClient<Object>;
