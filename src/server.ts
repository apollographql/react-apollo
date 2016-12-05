
import { Children } from 'react';
import * as ReactDOM from 'react-dom/server';
import ApolloClient from 'apollo-client';
import assign = require('object-assign');


declare interface Context {
  client?: ApolloClient;
  store?: any;
  [key: string]: any;
}

declare interface QueryTreeArgument {
  rootElement: any;
  rootContext?: Context;
}

declare interface QueryResult {
  query: Promise<any>;
  element: any;
  context: any;
}

// Recurse an React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
//   or recurse into its child elements
export function walkTree(
  element: any,
  context: any,
  visitor: (element: any, instance: any, context: any) => boolean | void
) {
  const Component = element.type;
  // a stateless functional component or a class
  if (typeof Component === 'function') {
    const props = assign({}, Component.defaultProps, element.props);
    let childContext = context;
    let child;

    // Are we are a react class?
    //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L66
    if (Component.prototype && Component.prototype.isReactComponent) {
      const instance = new Component(props, context);
      // In case the user doesn't pass these to super in the constructor
      instance.props = instance.props || props;
      instance.context = instance.context || context;

      // Override setState to just change the state, not queue up an update.
      //   (we can't do the default React thing as we aren't mounted "properly"
      //   however, we don't need to re-render as well only support setState in
      //   componentWillMount, which happens *before* render).
      instance.setState = (newState) => {
        instance.state = assign({}, instance.state, newState);
      };

      // this is a poor man's version of
      //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L181
      if (instance.componentWillMount) {
        instance.componentWillMount();
      }

      if (instance.getChildContext) {
        childContext = assign({}, context, instance.getChildContext());
      }

      if (visitor(element, instance, context) === false) {
        return;
      }

      child = instance.render();
    } else { // just a stateless functional
      if (visitor(element, null, context) === false) {
        return;
      }

      child = Component(props, context);
    }

    if (child) {
      walkTree(child, childContext, visitor);
    }
  } else { // a basic string or dom element, just get children
    if (visitor(element, null, context) === false) {
      return;
    }

    if (element.props && element.props.children) {
      Children.forEach(element.props.children, (child: any) => {
        if (child) {
          walkTree(child, context, visitor);
        }
      });
    }
  }
}

function getQueriesFromTree(
  { rootElement, rootContext = {} }: QueryTreeArgument, fetchRoot: boolean = true
): QueryResult[] {
  const queries = [];

  walkTree(rootElement, rootContext, (element, instance, context) => {

    const skipRoot = !fetchRoot && (element === rootElement);
    if (instance && typeof instance.fetchData === 'function' && !skipRoot) {
      const query = instance.fetchData();
      if (query) {
        queries.push({ query, element, context });

        // Tell walkTree to not recurse inside this component;  we will
        // wait for the query to execute before attempting it.
        return false;
      }
    }
  });

  return queries;
}

// XXX component Cache
export function getDataFromTree(rootElement, rootContext: any = {}, fetchRoot: boolean = true): Promise<void> {

  let queries = getQueriesFromTree({ rootElement, rootContext }, fetchRoot);

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve();

  // wait on each query that we found, re-rendering the subtree when it's done
  const mappedQueries = queries.map(({ query, element, context }) =>  {
    // we've just grabbed the query for element, so don't try and get it again
    return query.then(_ => getDataFromTree(element, context, false));
  });
  return Promise.all(mappedQueries).then(_ => null);
}

export function renderToStringWithData(component) {
  return getDataFromTree(component)
    .then(() => ReactDOM.renderToString(component));
}

export function cleanupApolloState(apolloState) {
  for (let queryId in apolloState.queries) {
    let fieldsToNotShip = ['minimizedQuery', 'minimizedQueryString'];
    for (let field of fieldsToNotShip) delete apolloState.queries[queryId][field];
  }
}
