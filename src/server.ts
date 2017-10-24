import { ReactElement } from 'react';
import * as ReactDOM from 'react-dom/server';

import { getDataFromTree } from './getDataFromTree';

export * from './getDataFromTree';
export function renderToStringWithData(
  component: ReactElement<any>,
): Promise<string> {
  return getDataFromTree(component).then(() =>
    ReactDOM.renderToString(component),
  );
}
