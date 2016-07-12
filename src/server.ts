
import { Children, createElement } from 'react';
import * as ReactDOM from 'react-dom/server';
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
2. Bulid the context and props (global props + parent props)
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
  component: any;
  queries?: any[];
  context?: Context;
}

export function getPropsFromChild(child) {
  const { props, type } = child;
  let ownProps = assign({}, props);
  if (type && type.defaultProps) ownProps = assign(type.defaultProps, props);
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
      const { query, component, ownProps, key, context } = queryDetails;
      return client.query(query)
        .then(result => {
          const { data, errors } = result as any;
          ownProps[key] = assign({ loading: false, errors }, data);
          return { component, ownProps: assign({}, ownProps), context: assign({}, context) };
        });
    });

  return Promise.all(queries);
}

const defaultReactProps = { loading: true, errors: null };
function getQueriesFromTree({ component, context = {}, queries = []}: QueryTreeArgument) {

  if (!component) return;
  let { client, store } = context;

  // stateless function
  if (typeof component === 'function') component = { type: component };
  const { type, props } = component;

  if (typeof type === 'function') {
    let ComponentClass = type;
    let ownProps = getPropsFromChild(component);
    const { state }  = context;

     // see if this is a connect type
    if (typeof type.mapQueriesToProps === 'function') {
      const data = type.mapQueriesToProps({ ownProps, state });
      for (let key in data) {
        if (!data.hasOwnProperty(key)) continue;

        ownProps[key] = assign({}, defaultReactProps);
        if (data[key].ssr === false) continue; // don't run this on the server

        queries.push({
          query: data[key],
          component: type.WrappedComponent,
          key,
          ownProps,
          context,
        });
      }

      ComponentClass = type.WrappedComponent;
    }

    const Component = new ComponentClass(ownProps, context);

    let newContext = context;
    if (Component.getChildContext) newContext = assign({}, context, Component.getChildContext());

    if (!store && ownProps.store) store = ownProps.store;
    if (!store && newContext.store) store = newContext.store;

    if (!client && ownProps.client && ownProps.client instanceof ApolloClient) {
      client = ownProps.client as ApolloClient;
    }
    if (!client && newContext.client && newContext.client instanceof ApolloClient) {
      client = newContext.client as ApolloClient;
    }

    getQueriesFromTree({
      component: getChildFromComponent(Component),
      context: newContext,
      queries,
    });
  } else if (props && props.children) {
    Children.forEach(props.children, (child: any) => getQueriesFromTree({
      component: child,
      context,
      queries,
    }));
  }

  return { queries, client, store };
}

// XXX component Cache
export function getDataFromTree(app, ctx: any = {}): Promise<any> {

  let { client, store, queries } = getQueriesFromTree({ component: app, context: ctx });

  if (!store && client && !client.store) client.initStore();
  if (!store && client && client.store) store = client.store;
  // no client found, nothing to do
  if (!client || !store) return Promise.resolve(null);

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve({ store, client, initialState: store.getState() });

  // run through all queries we can
  return processQueries(queries, client)
      .then(trees => Promise.all(trees.map(x => {
          const { component, ownProps, context } = x;
          if (!component) return;
          // Traverse wrapped components of resulting queries
          // NOTE: sub component queries may fire again,
          // but they will just return back existing data
          const Element = createElement(component, ownProps) as any;
          const child = getChildFromComponent(Element && new Element.type(ownProps, context));
          if (!child) return;

          // traverse children nodes
          return getDataFromTree(child, context);
      })))
      .then(() => ({ store, client, initialState: store.getState() }));

}

export function renderToStringWithData(component) {
  return getDataFromTree(component)
    .then(({ store, client }) => {
      let markup = ReactDOM.renderToString(component);
      let initialState = store.getState();
      const key = client.reduxRootKey;
      // XXX apollo client requires a lot in the store
      // can we make this samller?
      for (let queryId in initialState[key].queries) {
        let fieldsToNotShip = ['minimizedQuery', 'minimizedQueryString'];
        for (let field of fieldsToNotShip)  delete initialState[key].queries[queryId][field];
      }
      initialState = encodeURI(JSON.stringify(initialState));
      const payload = `<script>window.__APOLLO_STATE__ = ${initialState};</script>`;
      markup += payload;
      return markup;
    });
}
