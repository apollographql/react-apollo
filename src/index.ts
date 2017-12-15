export * from './browser';
import {
  getDataFromTree as _getDataFromTree,
  walkTree as _walkTree,
} from './getDataFromTree';

export const getDataFromTree = _getDataFromTree;
export const walkTree = _walkTree;

export { renderToStringWithData } from './server';
//# sourceMappingURL=index.js.map
