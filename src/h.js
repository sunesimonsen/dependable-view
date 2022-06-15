export const h = (type, props, ...children) => ({
  type: type,
  props: props || {},
  children: children.length ? children.flat() : null,
});
