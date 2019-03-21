import React from 'react';
import { ApolloContext } from './ApolloContext';

export function useApolloClient() {
  if (!ApolloContext) {
    throw new Error('The useApolloClient needs React version 16.8 or higher');
  }
  return React.useContext(ApolloContext);
}
