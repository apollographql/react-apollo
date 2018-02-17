import {
  Children,
  ReactElement,
  ReactNode,
  Component,
  ComponentType,
  ComponentClass,
  ChildContextProvider,
} from 'react';
import ApolloClient from 'apollo-client';

export interface Context<Cache> {
  client?: ApolloClient<Cache>;
  store?: any;
  [key: string]: any;
}

export interface QueryTreeArgument<Cache> {
  rootElement: ReactElement<any>;
  rootContext?: Context<Cache>;
}

export interface QueryTreeResult<Cache> {
  query: Promise<Object>;
  element: ReactElement<any>;
  context: Context<Cache>;
}

interface PreactElement<P> {
  attributes: P;
}

function getProps<P>(element: ReactElement<P> | PreactElement<P>): P {
  return (
    (element as ReactElement<P>).props ||
    (element as PreactElement<P>).attributes
  );
}

function isReactElement(
  element: string | number | true | {} | ReactElement<any> | React.ReactPortal,
): element is ReactElement<any> {
  return !!(element as any).type;
}

function isComponentClass(
  Comp: ComponentType<any>,
): Comp is ComponentClass<any> {
  return (
    Comp.prototype && (Comp.prototype.render || Comp.prototype.isReactComponent)
  );
}

function providesChildContext(
  instance: Component<any>,
): instance is Component<any> & ChildContextProvider<any> {
  return !!(instance as any).getChildContext;
}

// Recurse a React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
//   or recurse into its child elements
export function walkTree<Cache>(
  element: ReactNode,
  context: Context<Cache>,
  visitor: (
    element: ReactElement<any> | string | number,
    instance: Component<any> | null,
    context: Context<Cache>,
  ) => boolean | void,
) {
  if (Array.isArray(element)) {
    element.forEach(item => walkTree(item, context, visitor));

    return;
  }

  if (!element) return;

  // a stateless functional component or a class
  if (isReactElement(element)) {
    if (typeof element.type === 'function') {
      const Comp = element.type;
      const props = Object.assign({}, Comp.defaultProps, getProps(element));
      let childContext = context;
      let child;

      // Are we are a react class?
      //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L66
      if (isComponentClass(Comp)) {
        const instance = new Comp(props, context);
        // In case the user doesn't pass these to super in the constructor
        instance.props = instance.props || props;
        instance.context = instance.context || context;
        // set the instance state to null (not undefined) if not set, to match React behaviour
        instance.state = instance.state || null;

        // Override setState to just change the state, not queue up an update.
        //   (we can't do the default React thing as we aren't mounted "properly"
        //   however, we don't need to re-render as well only support setState in
        //   componentWillMount, which happens *before* render).
        instance.setState = newState => {
          if (typeof newState === 'function') {
            // React's TS type definitions don't contain context as a third parameter for
            // setState's updater function.
            // Remove this cast to `any` when that is fixed.
            newState = (newState as any)(
              instance.state,
              instance.props,
              instance.context,
            );
          }
          instance.state = Object.assign({}, instance.state, newState);
        };

        // this is a poor man's version of
        //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L181
        if (instance.componentWillMount) {
          instance.componentWillMount();
        }

        if (providesChildContext(instance)) {
          childContext = Object.assign({}, context, instance.getChildContext());
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

        child = Comp(props, context);
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
  } else if (typeof element === 'string' || typeof element === 'number') {
    // Just visit these, they are leaves so we don't keep traversing.
    visitor(element, null, context);
  }
  // TODO: Portals?
}

function hasFetchDataFunction(
  instance: Component<any>,
): instance is Component<any> & { fetchData: () => Object } {
  return typeof (instance as any).fetchData === 'function';
}

function isPromise<T>(query: Object): query is Promise<T> {
  return typeof (query as any).then === 'function';
}

function getQueriesFromTree<Cache>(
  { rootElement, rootContext = {} }: QueryTreeArgument<Cache>,
  fetchRoot: boolean = true,
): QueryTreeResult<Cache>[] {
  const queries: QueryTreeResult<Cache>[] = [];

  walkTree(rootElement, rootContext, (element, instance, context) => {
    const skipRoot = !fetchRoot && element === rootElement;
    if (skipRoot) return;

    if (instance && isReactElement(element) && hasFetchDataFunction(instance)) {
      const query = instance.fetchData();
      if (isPromise<Object>(query)) {
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
export default function getDataFromTree(
  rootElement: ReactElement<any>,
  rootContext: any = {},
  fetchRoot: boolean = true,
): Promise<void> {
  let queries = getQueriesFromTree({ rootElement, rootContext }, fetchRoot);

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve();

  const errors: any[] = [];
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
              `${
                errors.length
              } errors were thrown when executing your GraphQL queries.`,
            );
      error.queryErrors = errors;
      throw error;
    }
  });
}
