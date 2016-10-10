
import { Children } from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient from 'apollo-client';
import assign = require('object-assign');
import flatten = require('lodash.flatten');


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
  if (type && type.defaultProps) ownProps = assign({}, type.defaultProps, props);
  return ownProps;
}

export function getChildFromComponent(component) {
  // See if this is a class, or stateless function
  if (component && component.render) return component.render();
  return component;
}

let contextStore = {};
function getQueriesFromTree(
  { component, context = {}, queries = []}: QueryTreeArgument, fetch: boolean = true
) {
  contextStore = assign({}, contextStore, context);
  if (!component) return;

  // stateless function
  if (typeof component === 'function') component = { type: component };
  const { type, props } = component;

  if (typeof type === 'function') {
    let ComponentClass = type;
    let ownProps = getPropsFromChild(component);
    const Component = new ComponentClass(ownProps, context);
    try {
      Component.setState = (newState: any) => {
        Component.state = assign({}, Component.state, newState);
      };
    } catch (e) {} // tslint:disable-line
    if (Component.componentWillMount) Component.componentWillMount();

    let newContext = context;
    if (Component.getChildContext) newContext = assign({}, context, Component.getChildContext());

    // see if there is a fetch data method
    if (typeof type.fetchData === 'function' && fetch) {
      const query = type.fetchData(ownProps, newContext);
      if (query) queries.push({ query, component });
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

  return { queries, context: contextStore };
}

// XXX component Cache
export function getDataFromTree(app, ctx: any = {}, fetch: boolean = true): Promise<any> {

  // reset for next loop
  contextStore = {};
  let { context, queries } = getQueriesFromTree({ component: app, context: ctx }, fetch);
  // reset for next loop
  contextStore = {};

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve(context);

  const mappedQueries = flatten(queries).map(y => y.query.then(x => y));
  // run through all queries we can
  return Promise.all(mappedQueries)
    .then(trees => Promise.all(trees.filter(x => !!x).map((x: any) => {
      return getDataFromTree(x.component, context, false); // don't rerun `fetchData'
    })))
    .then(() => (context));

}

export function renderToStringWithData(component) {
  return getDataFromTree(component)
    .then(({ client }) => {
      let markup = ReactDOM.renderToString(component);
      let apolloState = client.queryManager.getApolloState();

      for (let queryId in apolloState.queries) {
        let fieldsToNotShip = ['minimizedQuery', 'minimizedQueryString'];
        for (let field of fieldsToNotShip) delete apolloState.queries[queryId][field];
      }

      // it's OK, because apolloState is nested somewhere in globalState
      return { markup, initialState: client.store.getState() };
    });
}
