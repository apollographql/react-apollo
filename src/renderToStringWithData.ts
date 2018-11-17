import { ReactElement } from 'react';
import defaultRenderFunction from './defaultRenderFunction';
import { default as getDataFromTree } from './getDataFromTree';

export function renderToStringWithData(component: ReactElement<any>): Promise<string> {
  return getDataFromTree(component).then(() => defaultRenderFunction(component));
}
