export { default as getDataFromTree } from './getDataFromTree';
export * from './getDataFromTree';

export * from './Context';

export { default as Query } from './Query';
export * from './Query';

export { default as Mutation } from './Mutation';
export * from './Mutation';

export { default as Subscription } from './Subscriptions';
export * from './Subscriptions';

export { graphql } from './graphql';
export * from './query-hoc';
export * from './mutation-hoc';

export { default as withApollo } from './withApollo';

export * from './types';

// XXX remove in the next breaking semver change (3.0)
const compose = require('lodash/flowRight');
export { compose };
