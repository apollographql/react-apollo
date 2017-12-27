import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import getDataFromTree from './getDataFromTree';

export default function renderToStringWithData(
  component: React.ReactElement<any>,
): Promise<string> {
  return getDataFromTree(component).then(() =>
    ReactDOM.renderToString(component),
  );
}
