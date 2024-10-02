import { arrayDiff, InsertDiff, MoveDiff, RemoveDiff } from "./arrayDiff.js";

import {
  computed,
  observable,
  track,
  flush as flushState,
} from "@dependable/state";

const isArray = (v) => Array.isArray(v);
const getAnchor = (dom) => (isArray(dom) ? getAnchor(dom[0]) : dom);

const removeChildren = (container) => {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

export const mount = (vdom) => {
  if (isArray(vdom)) {
    return vdom.flatMap(mount);
  } else {
    return vdom._mount();
  }
};

export const flush = (vdom) => {
  if (isArray(vdom)) {
    return vdom.flatMap(flush);
  } else {
    return vdom && vdom._flush && vdom._flush();
  }
};

const unmount = (vdom) => {
  if (isArray(vdom)) {
    vdom.map(unmount);
  } else if (vdom) {
    vdom._unmount();
  }
};

const appendChildren = (container, children) => {
  if (isArray(children)) {
    children.forEach((child) => {
      appendChildren(container, child);
    });
  } else {
    container.appendChild(children);
  }
};

const insertBefore = (dom, referenceNode) => {
  if (isArray(dom)) {
    dom.forEach((node) => {
      insertBefore(node, referenceNode);
    });
  } else {
    referenceNode.parentNode.insertBefore(dom, referenceNode);
  }
};

const getDom = (vdom) => (isArray(vdom) ? vdom.map((c) => c._dom) : vdom._dom);

function shallowEqual(a, b) {
  const prevKeys = Object.keys(a);
  const keys = Object.keys(b);
  if (prevKeys.length !== keys.length) return false;

  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (b[key] !== a[key]) return false;
  }

  return true;
}

class UserComponent {
  constructor({ type, props, children }, context) {
    const Constructor = type;
    this._type = type;
    this._props = observable(props);
    this._children = observable(children);
    this._defaultProps = (Constructor.defaultProps || (() => ({})))();

    this._instanceProps = computed(() => ({
      ...this._defaultProps,
      ...this._props(),
      children: this._children(),
    }));

    const instanceProps = this._instanceProps();
    const instance = new Constructor(instanceProps, context._userContext);

    this._instance = instance;
    this._render = this._render.bind(this);
    this._mounted = false;
    this._dependencies = new Set();
    instance.context = context._userContext;
    instance.props = instanceProps;
    if (instance.didCatch) {
      instance.didCatch = instance.didCatch.bind(instance);
    }

    this._context = {
      ...context,
      _priority: context._priority + 1,
      _errorHandler: instance.didCatch || context._errorHandler,
    };
  }

  get _dom() {
    return getDom(this._vdom);
  }

  _update(tree) {
    if (!shallowEqual(this._props(), tree.props)) {
      this._props(tree.props);
    }
    if (this._children() !== tree.children) {
      this._children(tree.children);
    }
  }

  _renderVDom() {
    try {
      let result;

      const nextProps = this._instanceProps();
      this._instance.props = nextProps;
      const capturedDependencies = track(() => {
        result = this._instance.render(nextProps, this._context._userContext);
      });

      for (const dependency of this._dependencies) {
        if (!capturedDependencies.has(dependency)) {
          dependency.unsubscribe(this._render);
        }
      }

      for (const dependency of capturedDependencies) {
        dependency.subscribe(this._render, this._context._priority);
      }

      this._dependencies = capturedDependencies;

      return result;
    } catch (e) {
      this._context._errorHandler(e);
    }
  }

  _render() {
    // It is possible to have a pending render, that is cancelled by unmounting
    // the component, so we need to not execute that render.
    if (this._mounted) {
      const instance = this._instance;

      try {
        this._vdom = update(this._renderVDom(), this._vdom, this._context);

        instance.didUpdate && instance.didUpdate();
        instance.didRender && instance.didRender();
      } catch (e) {
        this._context._errorHandler(e);
      }
    }
  }

  _mount() {
    try {
      const instance = this._instance;

      if (instance.willMount) {
        instance.willMount();
        flushState();
      }

      this._instanceProps.subscribe(this._render, this._context._priority);
      this._vdom = create(this._renderVDom(), this._context);

      const dom = mount(this._vdom);

      return dom;
    } catch (e) {
      this._context._errorHandler(e);
      this._vdom = new Hidden();
      return mount(this._vdom);
    }
  }

  _insertBefore(dom) {
    getAnchor(this._vdom)._insertBefore(dom);
  }

  _unmount() {
    const instance = this._instance;

    this._instanceProps.unsubscribe(this._render);

    for (const dependency of this._dependencies) {
      dependency.unsubscribe(this._render);
    }

    try {
      instance.willUnmount && instance.willUnmount();
    } catch (e) {
      this._context._errorHandler(e);
    }
    unmount(this._vdom);
    this._mounted = false;
  }

  _flush() {
    try {
      flush(this._vdom);
      this._mounted = true;
      this._instance.didMount && this._instance.didMount();
      this._instance.didRender && this._instance.didRender();
    } catch (e) {
      this._context._errorHandler(e);
    }
  }
}

const propWithoutDot = (p) => p.slice(1);

const setStyles = (style, value, prevValue) => {
  if (typeof value === "string") {
    style.cssText = value;
  } else {
    const prevValueWasString = typeof prevValue === "string";
    const hasPrevValue = !prevValueWasString && prevValue;
    if (prevValueWasString) {
      style.cssText = "";
    }

    for (const name in value) {
      if (!hasPrevValue || value[name] !== prevValue[name]) {
        style.setProperty(name, value[name]);
      }
    }
  }
};

const captureRegex = /Capture$/;
const eventPropRegex = /^on/;

const isCapturePhase = (name) => captureRegex.test(name);
const isEventHandlerProp = (name) => eventPropRegex.test(name);

const eventHandlerPropToEventName = (name) => {
  const eventName = name.replace(eventPropRegex, "").replace(captureRegex, "");
  const loweredEventName = eventName.toLowerCase();

  return `on${loweredEventName}` in document ? loweredEventName : eventName;
};

const mapPropName = (name) => (name === "className" ? "class" : name);

const addEventListener = (dom, name, listener) => {
  if (listener) {
    dom.addEventListener(
      eventHandlerPropToEventName(name),
      listener,
      isCapturePhase(name)
    );
  }
};

const removeEventListener = (dom, name, listener) => {
  dom.removeEventListener(
    eventHandlerPropToEventName(name),
    listener,
    isCapturePhase(name)
  );
};

class PrimitiveComponent {
  constructor({ type, props, children }, context) {
    this._type = type;
    this._props = props;
    this._context = type === "svg" ? { ...context, _isSvg: true } : context;
    this._children = children && create(children, this._context);
  }

  _update(tree) {
    const props = tree.props;

    for (const p in this._props) {
      if (p !== "key" && p !== "ref" && !(p in props)) {
        const value = this._props[p];
        if (isEventHandlerProp(p)) {
          removeEventListener(this._dom, p, value);
        } else if (p[0] !== ".") {
          if (p === "style") {
            this._dom.style.cssText = "";
          }
          this._dom.removeAttribute(mapPropName(p));
        }
      }
    }

    for (const p in props) {
      const prevValue = this._props[p];
      const value = props[p];

      if (p !== "key" && p !== "ref" && prevValue !== value) {
        if (isEventHandlerProp(p)) {
          removeEventListener(this._dom, p, prevValue);
          addEventListener(this._dom, p, value);
        } else if (p[0] === ".") {
          this._dom[propWithoutDot(p)] = value;
        } else if (p === "style") {
          setStyles(this._dom.style, value, prevValue);
        } else if (value === true) {
          this._dom.setAttribute(mapPropName(p), "");
        } else if (!value) {
          this._dom.removeAttribute(mapPropName(p));
        } else {
          this._dom.setAttribute(mapPropName(p), value);
        }
      }
    }

    if (props.ref && this._props.ref !== props.ref) {
      props.ref(this._dom);
    }

    this._props = props;

    const children = tree.children;

    if (this._children !== children) {
      if (children === null) {
        unmount(this._children);
        this._children = children;
      } else if (this._children === null) {
        this._children = create(children, this._context);
        appendChildren(this._dom, mount(this._children));
        flush(this._children);
      } else {
        this._children = update(children, this._children, this._context);
      }
    }
  }

  _mount() {
    if (this._context._isSvg) {
      this._dom = document.createElementNS(
        "http://www.w3.org/2000/svg",
        this._type
      );
    } else {
      this._dom = document.createElement(this._type);
    }

    for (const p in this._props) {
      if (p !== "key" && p !== "ref") {
        const value = this._props[p];
        if (isEventHandlerProp(p)) {
          addEventListener(this._dom, p, value);
        } else if (p[0] === ".") {
          this._dom[propWithoutDot(p)] = value;
        } else if (p === "style") {
          setStyles(this._dom.style, value);
        } else if (value === true) {
          this._dom.setAttribute(mapPropName(p), "");
        } else if (value) {
          this._dom.setAttribute(mapPropName(p), value);
        }
      }
    }

    if (this._children) {
      appendChildren(this._dom, mount(this._children));
    }

    if (this._props.ref) {
      this._props.ref(this._dom);
    }

    return this._dom;
  }

  _insertBefore(dom) {
    insertBefore(dom, this._dom);
  }

  _unmount() {
    unmount(this._children);
    this._dom.remove();
  }

  _flush() {
    flush(this._children);
  }
}

class Text {
  constructor(value) {
    this._type = "text";
    this._value = value;
  }

  _mount() {
    this._dom = document.createTextNode(this._value);
    return this._dom;
  }

  _updateText(value) {
    if (this._value !== value) {
      this._dom.textContent = value;
      this._value = value;
    }
  }

  _insertBefore(dom) {
    insertBefore(dom, this._dom);
  }

  _unmount() {
    this._dom.remove();
  }
}

class Hidden {
  constructor() {
    this._type = "hidden";
  }

  _mount() {
    this._dom = document.createComment("hidden");
    return this._dom;
  }

  _insertBefore(dom) {
    insertBefore(dom, this._dom);
  }

  _unmount() {
    this._dom.remove();
  }
}

class ContextUserComponent {
  render({ children }) {
    return children;
  }
}

class ContextComponent extends UserComponent {
  constructor({ type, props, children }, context) {
    super(
      { type: ContextUserComponent, props, children },
      {
        ...context,
        _userContext: Object.freeze({ ...context._userContext, ...props }),
      }
    );

    this._type = type;
  }
}

class PortalComponent extends Hidden {
  constructor(
    { type, props: { target = document.body } = {}, children },
    context
  ) {
    super();
    this._type = type;
    this._context = context;
    this._children = children && create(children, context);
    this._target = target;
  }

  _update(tree) {
    const target = tree.props.target || document.body;
    if (this._target !== target) {
      // Move DOM tree
      this._target = target;
      appendChildren(target, getDom(this._children));
    }

    this._children = update(tree.children, this._children, this._context);
  }

  _mount() {
    if (this._children) {
      appendChildren(this._target, mount(this._children));
      flush(this._children);
    }

    return super._mount();
  }

  _unmount() {
    unmount(this._children);
    super._unmount();
  }

  _flush() {
    flush(this._children);
  }
}

const isHidden = (value) =>
  value == null || value === false || (isArray(value) && !value.length);

export const create = (value, context) => {
  if (isHidden(value)) {
    return new Hidden();
  }

  if (isArray(value)) {
    return value.map((item) => create(item, context));
  }

  if (typeof value.type === "function") {
    try {
      return new UserComponent(value, context);
    } catch (e) {
      context._errorHandler(e);
      return new Hidden();
    }
  }

  if (typeof value === "object") {
    if (value.type === "Context") {
      return new ContextComponent(value, context);
    }

    if (value.type === "Portal") {
      return new PortalComponent(value, context);
    }

    return new PrimitiveComponent(value, context);
  }

  return new Text(String(value));
};

const getKey = (props) =>
  props && (typeof props === "function" ? props().key : props.key);

const hasKey = (value) =>
  value && typeof getKey(value.props || value._props) !== "undefined";

const similar = (a, b) =>
  a._type === b.type && getKey(a._props) === getKey(b.props);

const updateKeyedArray = (updatedTree, vdom, context) => {
  const updatedByKey = new Map();
  updatedTree.forEach((child) => {
    updatedByKey.set(getKey(child.props), child);
  });

  vdom.forEach((oldChild, i) => {
    const key = getKey(oldChild._props);
    if (updatedByKey.has(key)) {
      const newChild = updatedByKey.get(key);
      update(newChild, oldChild, context);
    }
  });

  const diff = arrayDiff(vdom, updatedTree, similar);

  const container = getAnchor(vdom[0]._dom).parentNode;
  const insertBefore = (dom, anchor) => {
    if (anchor) {
      anchor._insertBefore(dom);
    } else {
      appendChildren(container, dom);
    }
  };

  if (!diff.length) {
    return vdom;
  }

  diff.forEach((update) => {
    if (update instanceof InsertDiff) {
      const anchor = vdom[update._index];
      const newValues = update._values.map((child) => create(child, context));
      const dom = mount(newValues);
      insertBefore(dom, anchor);
      vdom.splice(update._index, 0, ...newValues);
      flush(newValues);
    } else if (update instanceof RemoveDiff) {
      const candidates = vdom.splice(update._index, update._howMany);
      unmount(candidates);
    } else if (update instanceof MoveDiff) {
      const anchor = vdom[update._to];
      const candidates = vdom.splice(update._from, update._howMany);
      const dom = candidates.map((c) => c._dom);
      insertBefore(dom, anchor);
      vdom.splice(update._to, 0, ...candidates);
    }
  });

  return vdom;
};

const updateArray = (updatedTree, vdom, context) => {
  if (hasKey(updatedTree[0]) && hasKey(vdom[0])) {
    return updateKeyedArray(updatedTree, vdom, context);
  }

  if (updatedTree.length && updatedTree.length === vdom.length) {
    for (let i = 0; i < updatedTree.length; i++) {
      vdom[i] = update(updatedTree[i], vdom[i], context);
    }
    return vdom;
  }

  const newVdom = create(updatedTree, context);
  getAnchor(vdom)._insertBefore(mount(newVdom));
  unmount(vdom);
  flush(newVdom);
  return newVdom;
};

export const update = (updatedTree, vdom, context) => {
  if (vdom._type === "hidden" && isHidden(updatedTree)) {
    return vdom;
  }

  if (
    vdom._type === "text" &&
    (typeof updatedTree === "string" || typeof updatedTree === "number")
  ) {
    vdom._updateText(updatedTree);
    return vdom;
  }

  if (updatedTree && updatedTree.type && updatedTree.type === vdom._type) {
    vdom._update(updatedTree);
    return vdom;
  }

  if (isArray(updatedTree) && updatedTree.length && isArray(vdom)) {
    return updateArray(updatedTree, vdom, context);
  }

  const newVdom = create(updatedTree, context);
  getAnchor(vdom)._insertBefore(mount(newVdom));
  unmount(vdom);
  flush(newVdom);
  return newVdom;
};

const reThrow = (e) => {
  throw e;
};

/**
 * Renders a virtual DOM into a container.
 *
 * @function
 *
 * @param {import('./shared').VNodes} vnodes the virtual DOM to render.
 * @param {import('./shared').Container} container the container to render into.
 * @param {import('./shared').Context} context the rendering context
 */
export const render = (vnodes, container = document.body, context = {}) => {
  removeChildren(container);
  const vdom = create(vnodes, {
    _userContext: Object.freeze(context),
    _errorHandler: reThrow,
    _isSvg: false,
    _priority: 0,
  });
  appendChildren(container, mount(vdom));
  flush(vdom);
};

/**
 * Clone a {@link VElement} with new properties and children
 *
 * @function
 *
 * @param {import('./shared').VElement} element the virual nodes to clone
 * @param {import('./shared').VElementOverrides} overrides the overrides for the virtual element
 * @return {import('./shared').VNode} the cloned virtual node
 */
export const clone = (element, overrides) => ({
  type: element.type,
  props: {
    ...element.props,
    ...overrides?.props,
  },
  children: overrides?.children || element.children,
});
