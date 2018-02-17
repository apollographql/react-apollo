import * as React from 'react';

import { DocumentNode } from 'graphql';

import Mutation from './Mutation';

const withMutation = (
  mutation: DocumentNode,
  options?: {
    variables?: Object
  },
) => Component => props => (
  <Mutation mutation={mutation} >
    {mutate => <Component {...props} mutate={options => {
      //TODO: Need to update the <Mutation /> component to also take the options as input parameter.
      return mutate(options);
    }} />}
  </Mutation>
);

export default withMutation;
