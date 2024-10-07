/**
 * Rendering context
 *
 * You can provide a context through the render function,
 * or you can define a new child context using the build-in
 * `Context` component.
 *
 * @example
 * Here we define two new context properties `foo` and `bar`:
 * ```js
 * h("Context", { foo: "foo", bar: "bar" }, children);
 * ```
 */
export type Context = Record<string, any>;

/**
 * Component properties
 *
 * Both custom components and DOM elements has a special property called `key`.
 * It is used to determine equality when diffing arrays.
 *
 * There are alse two special kind of properties for DOM elements.
 *
 * `ref` a function that will receive a reference to the DOM element.
 *
 * @example
 *
 * Storing the element ref on a component:
 *
 * ```js
 * class MyComponent {
 *   setReferenceToH1 = (element) => {
 *     this.element = element
 *   }
 *
 *   render() {
 *     return h("h1", { ref: this.setReferenceToH1 }, "Heading");
 *   }
 * }
 * ```
 *
 * `style` an inline CSS style property, can either be string or a hash.
 *
 * @example
 *
 * ```js
 * h("h1", style: "background: red", "In the red");
 * ```
 *
 * ```js
 * h("h1", style: { "background": "red" }, "In the red");
 * ```
 */
export type Props = Record<string, any> & {
  ref?: RefCallback;
  children?: VNodes;
};

export type RefCallback = (node: Element) => void;

/**
 * A user defined component
 *
 * @example
 *
 * ```js
 * class MyComponent implements Component {
 *   render({ color, children }) {
 *     return h("h1", style: { "background": "red" }, "In the red");
 *   }
 * }
 * ```
 */
export interface Component {
  /**
   * Method returning the virtual DOM for the component
   *
   * @param props the properties for the component
   * @param context the rendering context
   * @returns the virtual DOM for the component
   */
  render?(props: Props, context: Context): VNodes;

  /**
   * Is invoked just before a component is mounted.
   *
   * This method is a good place to initialize any observables before the first
   * render.
   */
  willMount?(): void;

  /**
   * Is invoked immediately after a component is mounted.
   *
   * This method is a good place to set up any subscriptions. If you do that,
   * don’t forget to unsubscribe in willUnmount().
   */
  didMount?(): void;

  /**
   * Is invoked immediately before a component is unmounted and destroyed.
   *
   * Perform any necessary cleanup in this method, such as invalidating timers,
   * canceling network requests, or cleaning up any subscriptions that were
   * created in didMount().
   */
  willUnMount?(): void;

  /**
   * Use this as an opportunity to operate on the DOM when the component has
   * been updated.
   */
  didUpdate?(): void;

  /**
   * Is invoked after each render.
   *
   * This method is a good place to invoke loading of data, or operate on the rendered DOM.
   */
  didRender?(): void;

  /**
   * This lifecycle is invoked after an error has been thrown by a descendant component.
   *
   * @param error the error that was thrown.
   */
  didCatch?(error: Error): void;
}

/**
 *
 * A user defined component
 */
export interface ComponentClass {
  /**
   * Constructor
   *
   * @param props the initial properties for the component
   * @param context the rendering context
   */
  new (props?: Props, context?: Context): Component;

  /**
   * Default props for the component
   */
  defaultProps?: Props;
}

/**
 * Defines a rendering portal into another target container
 *
 * @example
 * Appeding children to the document body
 *
 * ```js
 * return [
 *   h("h1", {}, "This is inside of the component"),
 *   h("Portal", {}, h("p", {}, "This is rendered inside of the document body"))
 * ];
 * ```
 *
 * @example
 * Appeding children to a specific target
 *
 * ```js
 * return [
 *   h("h1", {}, "This is inside of the component"),
 *   h("Portal", {}, h("p", {target}, "This is rendered inside of the document body"))
 * ];
 * ```
 */
export type Portal = "Portal";

/**
 * The type of a {@link VElement}
 *
 * It can either be any DOM tag name, a custom component, a Portal or a {@link Context}.
 */
export type VElementType = string | ComponentClass | Portal | "Context";

/**
 * Virtual DOM nodes
 */
export type VNodes = VNode[] | VNode;

/**
 * Virtual DOM node
 */
export type VNode = VElement | string | number | boolean | null | undefined;

/**
 * Properties of the virtual element
 */
export type VNodeProps = Record<string, any> & {
  ref?: RefCallback;
};

/**
 * Overrides for a VElement used in {@link clone}
 */
export type VElementOverrides = {
  /**
   * Properties of the virtual element
   */
  props?: VNodeProps;
  /**
   * Children of the virtual element
   */
  children?: VNodes;
};

/**
 * A virtual DOM element
 */
export type VElement = {
  /**
   * Type of the virtual element
   */
  type: VElementType;
  /**
   * Properties of the virtual element
   */
  props: VNodeProps;
  /**
   * Children of the virtual element
   */
  children: VNodes;
};

/**
 * A DOM container element that can be used as a rendering target
 */
export type Container = Element | Document | ShadowRoot | DocumentFragment;
