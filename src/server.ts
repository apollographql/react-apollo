import * as ReactDOM from 'react-dom/server';
import { getDataFromTree } from './getDataFromTree';

export function renderToStringWithData(component) {
  return getDataFromTree(component).then(function() {
    return ReactDOM.renderToString(component);
  });
}
//# sourceMappingURL=server.js.map
