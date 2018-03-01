import * as React from 'react';
import { ApolloClient } from 'apollo-client';

const { Provider, Consumer } = (React as any).createContext();

export interface ApolloProviderProps<TCache> {
  client: ApolloClient<TCache>;
  children: React.ReactNode;
}

export const ApolloProvider: React.StatelessComponent<any> = ({
  client,
  children,
}: ApolloProviderProps<any>) => <Provider value={client}>{children}</Provider>;

export interface ApolloConsumerProps {
  children: (client: ApolloClient<any>) => React.ReactElement<any> | null;
}

export const ApolloConsumer: React.StatelessComponent<ApolloConsumerProps> = Consumer;
