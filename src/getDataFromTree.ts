import * as React from 'react';
import * as PropTypes from 'prop-types';
import Query from './Query';
import { ObservableQuery } from 'apollo-client';
import { DocumentNode } from 'graphql';

type QueryInfo = {
  seen: boolean;
  observable: ObservableQuery<any, any> | null;
}

function makeDefaultQueryInfo(): QueryInfo {
  return {
    seen: false,
    observable: null,
  };
}

export class RenderPromises {
  // Map from Query component instances to pending fetchData promises.
  private queryPromises = new Map<Query<any, any>, Promise<any>>();

  // Two-layered map from (query document, stringified variables) to QueryInfo
  // objects. These QueryInfo objects are intended to survive through the whole
  // getMarkupFromTree process, whereas specific Query instances do not survive
  // beyond a single call to renderToStaticMarkup.
  private queryInfoTrie = new Map<DocumentNode, Map<string, QueryInfo>>();

  // Registers the server side rendered observable.
  public registerSSRObservable<TData, TVariables>(
    queryInstance: Query<TData, TVariables>,
    observable: ObservableQuery<any, TVariables>,
  ) {
    this.lookupQueryInfo(queryInstance).observable = observable;
  }

  // Get's the cached observable that matches the SSR Query instances query and variables.
  public getSSRObservable<TData, TVariables>(queryInstance: Query<TData, TVariables>) {
    return this.lookupQueryInfo(queryInstance).observable;
  }

  public addQueryPromise<TData, TVariables>(
    queryInstance: Query<TData, TVariables>,
    finish: () => React.ReactNode,
  ): React.ReactNode {
    const info = this.lookupQueryInfo(queryInstance);
    if (!info.seen) {
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
      // Make sure we never try to call fetchData for this query document and
      // these variables again. Since the queryInstance objects change with
      // every rendering, deduplicating them by query and variables is the
      // best we can do. If a different Query component happens to have the
      // same query document and variables, it will be immediately rendered
      // by calling finish() in addQueryPromise, which could result in the
      // rendering of an unwanted loading state, but that's not nearly as bad
      // as getting stuck in an infinite rendering loop because we kept calling
      // queryInstance.fetchData for the same Query component indefinitely.
      this.lookupQueryInfo(queryInstance).seen = true;
      promises.push(promise);
    });
    this.queryPromises.clear();
    return Promise.all(promises);
  }

  private lookupQueryInfo<TData, TVariables>(
    queryInstance: Query<TData, TVariables>,
  ): QueryInfo {
    const { queryInfoTrie } = this;
    const { query, variables } = queryInstance.props;
    const varMap = queryInfoTrie.get(query) || new Map<string, QueryInfo>();
    if (!queryInfoTrie.has(query)) queryInfoTrie.set(query, varMap);
    const variablesString = JSON.stringify(variables);
    const info = varMap.get(variablesString) || makeDefaultQueryInfo();
    if (!varMap.has(variablesString)) varMap.set(variablesString, info);
    return info;
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
