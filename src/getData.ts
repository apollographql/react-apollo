
import { Children, createElement } from 'react';
import ApolloClient from 'apollo-client';
import flatten = require('lodash.flatten');
import assign = require('object-assign');

/*

React components can return a `falsy` (null, false) value,
representation of a native DOM component (such as <div /> or React.DOM.div())
or another composite component. Components can have a render function (for components).
They can also pass through children which we want to analyze as well.

To get data from `connect()` components we do a few things:

1. if ssr is not falsy, move the query to a place to batch call it

Ideally, we go through the tree and find all `connect()`s (recursively going through tree)
If we reach the end of all nodes, we kick off the queries. Once queries have returned,
we try to go through their children components again to see if we discover any
more queries. Then once we reach th end, we render the dom.

We recursively do this until the tree is done.

So! Given a component:

1. See if it is falsy (end of line)
2. Bulid the context and props (global props + defaultProps + parent props)
3. See if the component is a `connect()`
3a. Get the queries using props + state
3b. as long as ssr != false, pass the query to the array to be called
4. Create the component (or child if connect) (`componentWillMount` will run)
5. Render the component
6. Repeat

*/

declare interface Context {
  client?: ApolloClient;
  store?: any;
  [key: string]: any;
}

declare interface QueryTreeArgument {
  components: any;
  queries?: any[];
  defaultProps?: any;
  context?: Context;
}

const defaultReactProps = {
  loading: true,
  errors: null,
};


export function getPropsFromChild(child, defaultProps = {}) {
  const { props, type } = child;
  let ownProps = assign(defaultProps, props);
  if (type && type.defaultProps) ownProps = assign(defaultProps, type.defaultProps, props);
  return ownProps;
}

export function getChildFromComponent(component) {
  // See if this is a class, or stateless function
  if (component && component.render) return component.render();
  return component;
}

export function processQueries(queries, client): Promise<any> {
  queries = flatten(queries)
    .map((queryDetails: any) => {
      const { query, component, ownProps, key } = queryDetails;
      return client.query(query)
        .then(result => {
          const { data, errors } = result as any;
          ownProps[key] = assign({ loading: false, errors }, data);
          return {
            component,
            ownProps: assign({}, ownProps),
          };
        });
    });

  return Promise.all(queries);
}

function getQueriesFromTree({
  components,
  queries = [],
  defaultProps = {},
  context = {},
}: QueryTreeArgument) {
  Children.forEach(components, (child: any) => {
    if (!child) return;
    // XXX make the context dynamic
    let { store, client } = context as Context;

    // get the store
    // XXX determine if this is actually a store
    if (!store && child.props && child.props.store) {
      context.store = store;
      delete child.props.store;
    }

    // find the client in the tree
    if (!client && child.props && child.props.client instanceof ApolloClient) {
      context.client = child.props.client as ApolloClient;
      // delete child.props.client;
      // for apps that don't provide their own store
      if (!store) {
        context.client.initStore();
        context.store = context.client.store;
      }
    }

    let ownProps = getPropsFromChild(child, defaultProps);
    let state = store ? store.getState() : {};

    // see if this is a connect file
    if (child.type && typeof child.type.mapQueriesToProps === 'function') {
      const dataRequirements = child.type.mapQueriesToProps({ ownProps, state });
      for (let query in dataRequirements) {
        ownProps[query] = assign({}, defaultReactProps);
        if (dataRequirements[query].ssr === false) continue; // don't run this on the server

        queries.push({
          key: query,
          query: dataRequirements[query],
          component: child.type.WrappedComponent,
          ownProps,
        });
      }
      const Element = createElement(child.type.WrappedComponent, ownProps) as any;
      const RenderedComponent = Element && new Element.type(ownProps, context);

      // See if this is a class, or stateless function
      child = getChildFromComponent(RenderedComponent) || child;

    }

    // if we know children, lets just render them
    if (child.props && child.props.children) {
      getQueriesFromTree({
        queries,
        context,
        defaultProps,
        components: child.props.children,
      });
    }

  });

  return {
    queries,
    context,
  };
}

// XXX component Cache
export default function getData(
  components,
  defaultProps: Object = {},
  defaultContext: Object = {}
): Promise<any> {

  let { queries, context } = getQueriesFromTree({
    components,
    defaultProps,
    context: defaultContext,
  });

  // no client found, nothing to do
  if (!context.client || !context.store) return Promise.resolve(null);

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve(context.store.getState());

  // run through all queries we can
  return processQueries(queries, context.client)
      .then(trees => {
        const subTrees = trees.map(x => {
          const { component, ownProps } = x;
          if (!component) return;

          // Traverse wrapped components of resulting queries
          // NOTE: sub component queries may fire again,
          // but they will just return back existing data
          const Element = createElement(component, ownProps) as any;
          const child = getChildFromComponent(Element && new Element.type(ownProps, context));
          if (!child) return;

          // traverse children nodes
          return getData(child, defaultProps, context);
        });
        return Promise.all(subTrees);
      })
      .then(x => context.store.getState());

}
