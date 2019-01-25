import * as React from 'react';
import * as PropTypes from 'prop-types';
import Query from './Query';
import { ObservableQuery } from 'apollo-client';
import { DocumentNode } from 'graphql';

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

interface ObservableCacheEntry {
  variablesString: string; // Stringified query variables.
  observable: ObservableQuery<any, any>; // Observable used to issue the fetch.
}

export class RenderPromises {
  // Map from Query component instances to pending fetchData promises.
  private queryPromises = new Map<Query<any, any>, Promise<any>>();

  // Stores ObservableQueries by a query and variables combination.
  private ssrObservable = new Map<DocumentNode, ObservableCacheEntry[]>();

  // A way of remembering queries we've seen during previous renderings,
  // so that we never attempt to fetch them again in future renderings.
  private queryGraveyard = new Trie();

  // Registers the server side rendered observable.
  public registerSSRObservable<TData, TVariables>(
    queryInstance: Query<TData, TVariables>,
    observable: ObservableQuery<any, TVariables>,
  ) {
    const { query, variables } = queryInstance.props;
    const variablesString = JSON.stringify(variables);
    // Cache the Observable so new instances of the Query Component
    // can use the original observable. Necessary for errorPolicy="all".
    let mapEntry = this.ssrObservable.get(query);
    if (!mapEntry) {
      mapEntry = [];
      this.ssrObservable.set(query, mapEntry);
    }
    mapEntry.push({ variablesString, observable });
  }

  // Get's the cached observable that matches the SSR Query instances query and variables.
  public getSSRObservable<TData, TVariables>(queryInstance: Query<TData, TVariables>) {
    const { query, variables } = queryInstance.props;
    const variablesString = JSON.stringify(variables);
    const mapEntry = this.ssrObservable.get(query);
    if (mapEntry) {
      const observableEntry = mapEntry.find(entry => entry.variablesString === variablesString);
      if (observableEntry) {
        return observableEntry.observable;
      }
    }

    return null;
  }

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

export default function getDataFromTree(
  tree: React.ReactNode,
  context: { [key: string]: any } = {},
) {
  return getMarkupFromTree({
    tree,
    context,
    // If you need to configure this renderFunction, call getMarkupFromTree
    // directly instead of getDataFromTree.
    renderFunction: require("react-dom/server").renderToStaticMarkup,
  });
}

export type GetMarkupFromTreeOptions = {
  tree: React.ReactNode;
  context?: { [key: string]: any };
  renderFunction?: (tree: React.ReactElement<any>) => string;
};

export function getMarkupFromTree({
  tree,
  context = {},
  // The rendering function is configurable! We use renderToStaticMarkup as
  // the default, because it's a little less expensive than renderToString,
  // and legacy usage of getDataFromTree ignores the return value anyway.
  renderFunction = require("react-dom/server").renderToStaticMarkup,
}: GetMarkupFromTreeOptions): Promise<string> {
  const renderPromises = new RenderPromises();

  class RenderPromisesProvider extends React.Component {
    static childContextTypes: { [key: string]: any } = {
      renderPromises: PropTypes.object,
    };

    getChildContext() {
      return { ...context, renderPromises };
    }

    render() {
      // Always re-render from the rootElement, even though it might seem
      // better to render the children of the component responsible for the
      // promise, because it is not possible to reconstruct the full context
      // of the original rendering (including all unknown context provider
      // elements) for a subtree of the orginal component tree.
      return tree;
    }
  }

  Object.keys(context).forEach(key => {
    RenderPromisesProvider.childContextTypes[key] = PropTypes.any;
  });

  function process(): Promise<string> | string {
    const html = renderFunction(React.createElement(RenderPromisesProvider));
    return renderPromises.hasPromises()
      ? renderPromises.consumeAndAwaitPromises().then(process)
      : html;
  }

  return Promise.resolve().then(process);
}
