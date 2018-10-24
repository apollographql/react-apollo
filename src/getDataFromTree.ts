import * as React from 'react';
import * as PropTypes from 'prop-types';
import { renderToStaticMarkup } from 'react-dom/server';
import Query from './Query';

// Like a Set, but for tuples. In practice, this class is used to store
// (query, JSON.stringify(variables)) tuples.
class Trie {
  private children: Map<any, Trie> | null = null;
  private added = false;

  has(...keys: any[]) {
    let node: Trie = this;
    return keys.every(key => {
      const child = node.children && node.children.get(key);
      return !!(child && (node = child));
    }) && node.added;
  }

  add(...keys: any[]) {
    let node: Trie = this;
    keys.forEach(key => {
      const map = node.children || (node.children = new Map);
      const child = map.get(key);
      if (child) {
        node = child;
      } else {
        map.set(key, node = new Trie());
      }
    });
    node.added = true;
  }
}

export class RenderPromises {
  // Map from Query component instances to pending fetchData promises.
  private queryPromises = new Map<Query<any, any>, Promise<any>>();

  // A way of remembering queries we've seen during previous renderings,
  // so that we never attempt to fetch them again in future renderings.
  private queryGraveyard = new Trie();

  public addQueryPromise<TData, TVariables>(
    queryInstance: Query<TData, TVariables>,
    finish: () => React.ReactNode,
  ): React.ReactNode {
    const { query, variables } = queryInstance.props;
    if (!this.queryGraveyard.has(query, JSON.stringify(variables))) {
      this.queryPromises.set(
        queryInstance,
        new Promise(resolve => {
          resolve(queryInstance.fetchData());
        }),
      );
      // Render null to abandon this subtree for this rendering, so that we
      // can wait for the data to arrive.
      return null;
    }
    return finish();
  }

  public hasPromises() {
    return this.queryPromises.size > 0;
  }

  public consumeAndAwaitPromises() {
    const promises: Promise<any>[] = [];
    this.queryPromises.forEach((promise, queryInstance) => {
      const { query, variables } = queryInstance.props;
      // Make sure we never try to call fetchData for this query document and
      // these variables again. Since the queryInstance objects change with
      // every rendering, deduplicating them by query and variables is the
      // best we can do. If a different Query component happens to have the
      // same query document and variables, it will be immediately rendered
      // by calling finish() in addQueryPromise, which could result in the
      // rendering of an unwanted loading state, but that's not nearly as bad
      // as getting stuck in an infinite rendering loop because we kept calling
      // queryInstance.fetchData for the same Query component indefinitely.
      this.queryGraveyard.add(query, JSON.stringify(variables));
      promises.push(promise);
    });
    this.queryPromises.clear();
    return Promise.all(promises);
  }
}

class RenderPromisesProvider extends React.Component<{
  renderPromises: RenderPromises;
}> {
  static childContextTypes = {
    renderPromises: PropTypes.object,
  };

  getChildContext() {
    return {
      renderPromises: this.props.renderPromises,
    };
  }

  render() {
    return this.props.children;
  }
}

export default function getDataFromTree(
  rootElement: React.ReactNode,
  // The rendering function is configurable! We use renderToStaticMarkup as
  // the default, because it's a little less expensive than renderToString,
  // and legacy usage of getDataFromTree ignores the return value anyway.
  renderFunction = renderToStaticMarkup,
): Promise<string> {
  const renderPromises = new RenderPromises();

  function process(): Promise<string> | string {
    const html = renderFunction(
      React.createElement(RenderPromisesProvider, {
        renderPromises,
        // Always re-render from the rootElement, even though it might seem
        // better to render the children of the component responsible for the
        // promise, because it is not possible to reconstruct the full context
        // of the original rendering (including all unknown context provider
        // elements) for a subtree of the orginal component tree.
        children: rootElement,
      })
    );

    return renderPromises.hasPromises()
      ? renderPromises.consumeAndAwaitPromises().then(process)
      : html;
  }

  return Promise.resolve().then(process);
}
