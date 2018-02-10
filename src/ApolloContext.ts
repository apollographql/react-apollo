import * as React from 'react';
import * as createReactContext from "create-react-context";
import { Context } from "create-react-context";
import ApolloClient from 'apollo-client';

// @ts-ignore
const ApolloContext: Context<ApolloClient<any>> = React.createContext
  // @ts-ignore
  ? React.createContext(undefined)
  // @ts-ignore TODO: Why is typescript complaining here?
  : createReactContext(undefined);

export default ApolloContext;
