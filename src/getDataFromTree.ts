import {
  Children,
  ReactElement,
  ReactNode,
  Component,
  ComponentType,
  ComponentClass,
} from 'react';
import ApolloClient from 'apollo-client';

export interface QueryTreeArgument<Cache> {
  rootElement: ReactElement<any>;
}

export interface QueryTreeResult<Cache> {
  query: Promise<Object>;
  element: ReactElement<any>;
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
  element: string | number | true | {} | ReactElement<any> | React.ReactPortal
): element is ReactElement<any> {
  return !!(element as any).type;
}

function isComponentClass(
  Comp: ComponentType<any>
): Comp is ComponentClass<any> {
  return (
    Comp.prototype && (Comp.prototype.render || Comp.prototype.isReactComponent)
  );
}

// Recurse a React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
//   or recurse into its child elements
export function walkTree<Cache>(
  element: ReactNode,
  visitor: (
    element: ReactElement<any> | string | number,
    instance: Component<any> | null
  ) => boolean | void
) {
  if (Array.isArray(element)) {
    element.forEach(item => walkTree(item, visitor));

    return;
  }

  if (!element) return;

  /*
   *
   * New react context API
   * XXX this is a first pass
   *
   */
  // a stateless functional component or a class
  if (isReactElement(element)) {
    // if this is a provider (would be nice to do a symbol check here)
    if ((element.type as any).context) {
      // attach the value to the provider
      ((element.type as any).context as any).currentValue = element.props.value;
    }

    const isConsumer =
      (element.type as any).Provider && (element.type as any).Consumer;
    // duck type check since we don't have symbols
    if (typeof element.type === 'function' || isConsumer) {
      const Comp = element.type as ComponentType<any>;
      const props = Object.assign({}, Comp.defaultProps, getProps(element));
      let child;

      // Are we are a react class?
      //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L66
      if (isComponentClass(Comp)) {
        const instance = new Comp(props);
        // In case the user doesn't pass these to super in the constructor
        instance.props = instance.props || props;
        // set the instance state to null (not undefined) if not set, to match React behaviour
        instance.state = instance.state || null;

        // Override setState to just change the state, not queue up an update.
        //   (we can't do the default React thing as we aren't mounted "properly"
        //   however, we don't need to re-render as well only support setState in
        //   componentWillMount, which happens *before* render).
        instance.setState = newState => {
          if (typeof newState === 'function') {
            newState = newState(instance.state, instance.props);
          }
          instance.state = Object.assign({}, instance.state, newState);
        };

        // this is a poor man's version of
        //   https://github.com/facebook/react/blob/master/src/renderers/shared/stack/reconciler/ReactCompositeComponent.js#L181
        if (instance.componentWillMount) {
          instance.componentWillMount();
        }

        if (visitor(element, instance) === false) {
          return;
        }

        child = instance.render();
      } else if (isConsumer) {
        // handle consumers
        child = element.props.children((element.type as any).currentValue);
      } else {
        // just a stateless functional
        if (visitor(element, null) === false) {
          return;
        }

        child = Comp(props);
      }

      if (child) {
        if (Array.isArray(child)) {
          child.forEach(item => walkTree(item, visitor));
        } else {
          walkTree(child, visitor);
        }
      }
    } else {
      // a basic string or dom element, just get children
      if (visitor(element, null) === false) {
        return;
      }

      if (element.props && element.props.children) {
        Children.forEach(element.props.children, (child: any) => {
          if (child) walkTree(child, visitor);
        });
      }
    }
  } else if (typeof element === 'string' || typeof element === 'number') {
    // Just visit these, they are leaves so we don't keep traversing.
    visitor(element, null);
  }
  // TODO: Portals?
}

function hasFetchDataFunction(
  instance: Component<any>
): instance is Component<any> & { fetchData: () => Object } {
  return typeof (instance as any).fetchData === 'function';
}

function isPromise<T>(query: Object): query is Promise<T> {
  return typeof (query as any).then === 'function';
}

function getQueriesFromTree<Cache>(
  { rootElement }: QueryTreeArgument<Cache>,
  fetchRoot: boolean = true
): QueryTreeResult<Cache>[] {
  const queries: QueryTreeResult<Cache>[] = [];

  walkTree(rootElement, (element, instance) => {
    const skipRoot = !fetchRoot && element === rootElement;
    if (skipRoot) return;

    if (instance && isReactElement(element) && hasFetchDataFunction(instance)) {
      const query = instance.fetchData();
      if (isPromise<Object>(query)) {
        queries.push({ query, element });

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
  fetchRoot: boolean = true
): Promise<void> {
  let queries = getQueriesFromTree({ rootElement }, fetchRoot);

  // no queries found, nothing to do
  if (!queries.length) return Promise.resolve();

  const errors: any[] = [];
  // wait on each query that we found, re-rendering the subtree when it's done
  const mappedQueries = queries.map(({ query, element }) => {
    // we've just grabbed the query for element, so don't try and get it again
    return query
      .then(_ => getDataFromTree(element, false))
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
              } errors were thrown when executing your GraphQL queries.`
            );
      error.queryErrors = errors;
      throw error;
    }
  });
}
