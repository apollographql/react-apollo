import { Children, ReactElement, StatelessComponent } from 'react';
import ApolloClient, { ApolloQueryResult } from 'apollo-client';
const assign = require('object-assign');

export interface Context<Cache> {
  client?: ApolloClient<Cache>;
  store?: any;
  [key: string]: any;
}

export interface QueryTreeArgument<Cache> {
  rootElement: ReactElement<any>;
  rootContext?: Context<Cache>;
}

export interface QueryResult<Cache> {
  query: Promise<ApolloQueryResult<any>>;
  element: ReactElement<any>;
  context: Context<Cache>;
}

// Recurse a React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
//   or recurse into its child elements
export function walkTree<Cache>(
  element: ReactElement<any>,
  context: Context<Cache>,
  visitor: (
    element: ReactElement<any>,
    instance: any,
    context: Context<Cache>,
  ) => boolean | void,
) {
  if (Array.isArray(element)) {
    element.forEach(item => walkTree(item, context, visitor));

    return;
  }
  const Component = element.type;
  // a stateless functional component or a class
  if (typeof Component === 'function') {
    const props = assign({}, Component.defaultProps, element.props);
    let childContext = context;
    let child;

    // Are we are a react class?
    //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L66
    if (Component.prototype && Component.prototype.isReactComponent) {
      // typescript force casting since typescript doesn't have definitions for class
      // methods
      const _component = Component as any;
      const instance = new _component(props, context);
      // In case the user doesn't pass these to super in the constructor
      instance.props = instance.props || props;
      instance.context = instance.context || context;

      // Override setState to just change the state, not queue up an update.
      //   (we can't do the default React thing as we aren't mounted "properly"
      //   however, we don't need to re-render as well only support setState in
      //   componentWillMount, which happens *before* render).
      instance.setState = newState => {
        if (typeof newState === 'function') {
          newState = newState(instance.state, instance.props, instance.context);
        }
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
    } else {
      // just a stateless functional
      if (visitor(element, null, context) === false) {
        return;
      }

      // typescript casting for stateless component
      const _component = Component as StatelessComponent<any>;
      child = _component(props, context);
    }

    if (child) {
      if (Array.isArray(child)) {
        child.forEach(item => walkTree(item, context, visitor));
      } else {
        walkTree(child, childContext, visitor);
      }
    }
  } else {
    // a basic string or dom element, just get children
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

function getQueriesFromTree<Cache>(
  { rootElement, rootContext = {} }: QueryTreeArgument<Cache>,
  fetchRoot: boolean = true,
): QueryResult<Cache>[] {
  const queries = [];

  walkTree(rootElement, rootContext, (element, instance, context) => {
    const skipRoot = !fetchRoot && element === rootElement;
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
export function getDataFromTree(
  rootElement: ReactElement<any>,
  rootContext: any = {},
  fetchRoot: boolean = true,
): Promise<void> {
  let queries = getQueriesFromTree({ rootElement, rootContext }, fetchRoot);

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve();

  const errors = [];
  // wait on each query that we found, re-rendering the subtree when it's done
  const mappedQueries = queries.map(({ query, element, context }) => {
    // we've just grabbed the query for element, so don't try and get it again
    return query
      .then(_ => getDataFromTree(element, context, false))
      .catch(e => errors.push(e));
  });

  // Run all queries. If there are errors, still wait for all queries to execute
  // so the caller can ignore them if they wish. See https://github.com/apollographql/react-apollo/pull/488#issuecomment-284415525
  return Promise.all(mappedQueries).then(_ => {
    if (errors.length > 0) {
      const error =
        errors.length === 1
          ? errors[0]
          : new Error(
              `${errors.length} errors were thrown when executing your GraphQL queries.`,
            );
      error.queryErrors = errors;
      throw error;
    }
  });
}
