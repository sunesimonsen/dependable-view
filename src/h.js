/**
 * Create a virtual DOM node.
 *
 * @function
 * @param {import('./shared').VElement["type"]} type The type of the virtual DOM node
 * @param {Record<string, any>} props The props of the virtual DOM node
 * @param {any[]} ...children The children of the virtual DOM node
 * @returns {import('./shared').VNode} VNode A virtual DOM node
 */
export const h = (type, props, ...children) => ({
  type: type,
  props: props || {},
  children: children.length ? children.flat() : null,
});
