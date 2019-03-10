import * as React from 'react';
import { Context } from './types';

interface PreactElement<P> {
  attributes: P;
}

function getProps<P>(element: React.ReactElement<P> | PreactElement<P>): P {
  return (element as React.ReactElement<P>).props || (element as PreactElement<P>).attributes;
}

function isReactElement(element: React.ReactNode): element is React.ReactElement<any> {
  return !!(element as any).type;
}

function isComponentClass(Comp: React.ComponentType<any>): Comp is React.ComponentClass<any> {
  return Comp.prototype && (Comp.prototype.render || Comp.prototype.isReactComponent);
}

function providesChildContext(
  instance: React.Component<any>,
): instance is React.Component<any> & React.ChildContextProvider<any> {
  return !!(instance as any).getChildContext;
}

// Recurse a React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
// or recurse into its child elements.
export function walkTree(
  element: React.ReactNode,
  context: Context,
  visitor: (
    element: React.ReactNode,
    instance: React.Component<any> | null,
    newContextMap: Map<any, any>,
    context: Context,
    childContext?: Context,
  ) => boolean | void,
  newContext: Map<any, any> = new Map(),
) {
  if (!element) {
    return;
  }

  if (Array.isArray(element)) {
    element.forEach(item => walkTree(item, context, visitor, newContext));
    return;
  }

  // A stateless functional component or a class
  if (isReactElement(element)) {
    if (typeof element.type === 'function') {
      const Comp = element.type;
      const props = Object.assign({}, Comp.defaultProps, getProps(element));
      let childContext = context;
      let child;

      // Are we are a react class?
      if (isComponentClass(Comp)) {
        const instance = new Comp(props, context);
        // In case the user doesn't pass these to super in the constructor.
        // Note: `Component.props` are now readonly in `@types/react`, so
        // we're using `defineProperty` as a workaround (for now).
        Object.defineProperty(instance, 'props', {
          value: instance.props || props,
        });
        instance.context = instance.context || context;

        // Set the instance state to null (not undefined) if not set, to match React behaviour
        instance.state = instance.state || null;

        // Override setState to just change the state, not queue up an update
        // (we can't do the default React thing as we aren't mounted
        // "properly", however we don't need to re-render as we only support
        // setState in componentWillMount, which happens *before* render).
        instance.setState = newState => {
          if (typeof newState === 'function') {
            // React's TS type definitions don't contain context as a third parameter for
            // setState's updater function.
            // Remove this cast to `any` when that is fixed.
            newState = (newState as any)(instance.state, instance.props, instance.context);
          }
          instance.state = Object.assign({}, instance.state, newState);
        };

        if (Comp.getDerivedStateFromProps) {
          const result = Comp.getDerivedStateFromProps(instance.props, instance.state);
          if (result !== null) {
            instance.state = Object.assign({}, instance.state, result);
          }
        } else if (instance.UNSAFE_componentWillMount) {
          instance.UNSAFE_componentWillMount();
        } else if (instance.componentWillMount) {
          instance.componentWillMount();
        }

        if (providesChildContext(instance)) {
          childContext = Object.assign({}, context, instance.getChildContext());
        }

        if (visitor(element, instance, newContext, context, childContext) === false) {
          return;
        }

        child = instance.render();
      } else {
        // Just a stateless functional
        if (visitor(element, null, newContext, context) === false) {
          return;
        }

        child = Comp(props, context);
      }

      if (child) {
        if (Array.isArray(child)) {
          child.forEach(item => walkTree(item, childContext, visitor, newContext));
        } else {
          walkTree(child, childContext, visitor, newContext);
        }
      }
    } else if ((element.type as any)._context || (element.type as any).Consumer) {
      // A React context provider or consumer
      if (visitor(element, null, newContext, context) === false) {
        return;
      }

      let child;
      if (!!(element.type as any)._context) {
        // A provider - sets the context value before rendering children
        // this needs to clone the map because this value should only apply to children of the provider
        newContext = new Map(newContext);
        newContext.set(element.type, element.props.value);
        child = element.props.children;
      } else {
        // A consumer
        let value = (element.type as any)._currentValue;
        if (newContext.has((element.type as any).Provider)) {
          value = newContext.get((element.type as any).Provider);
        }
        child = element.props.children(value);
      }

      if (child) {
        if (Array.isArray(child)) {
          child.forEach(item => walkTree(item, context, visitor, newContext));
        } else {
          walkTree(child, context, visitor, newContext);
        }
      }
    } else {
      // A basic string or dom element, just get children
      if (visitor(element, null, newContext, context) === false) {
        return;
      }

      if (element.props && element.props.children) {
        React.Children.forEach(element.props.children, (child: any) => {
          if (child) {
            walkTree(child, context, visitor, newContext);
          }
        });
      }
    }
  } else if (typeof element === 'string' || typeof element === 'number') {
    // Just visit these, they are leaves so we don't keep traversing.
    visitor(element, null, newContext, context);
  }
  // TODO: Portals?
}
