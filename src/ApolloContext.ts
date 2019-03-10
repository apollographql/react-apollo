import createReactContext from 'create-react-context';
import ApolloClient from 'apollo-client';
import { DocumentNode } from 'graphql';

export interface ApolloContextValue {
  client?: ApolloClient<Object>;
  operations?: Map<string, { query: DocumentNode; variables: any }>;
}

export default createReactContext<ApolloContextValue | undefined>(undefined);
