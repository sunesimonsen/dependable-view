import unexpected from "unexpected";
import unexpectedDom from "unexpected-dom";
import unexpectedSimon from "unexpected-sinon";
import { render, h } from "../src/index.js";
import { computed, observable, flush } from "@dependable/state";
import sinon from "sinon";

const expect = unexpected.clone().use(unexpectedSimon).use(unexpectedDom);

class ErrorBoundary {
  constructor() {
    this.error = observable(null);
  }

  render({ children, fallback }) {
    return this.error() ? fallback : children;
  }

  didCatch(e) {
    this.error(e);
  }
}

class ConditionalChildren {
  render({ visible, children }) {
    return visible ? children : null;
  }
}

describe("view", () => {
  let container, clock;

  beforeEach(() => {
    container = document.createElement("div");
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  describe("with simple markup", () => {
    it("renders the markup to DOM", () => {
      render(
        [
          h(
            "section",
            { "data-test-id": "intro" },
            h("h1", { class: "title" }, "Hello ", h("b", {}, "DOM!")),
            h("p", {}, "This will create some new DOM.")
          ),
          h("aside", {}, "You can have multiple root elements"),
        ],
        container
      );

      expect(
        container,
        "to satisfy",
        `<div><section data-test-id="intro"><h1 class="title">Hello <b>DOM!</b></h1><p>This will create some new DOM.</p></section><aside>You can have multiple root elements</aside></div>`
      );
    });
  });

  describe("with markup that contains a component", () => {
    it("renders the markup to DOM", () => {
      class Title {
        render({ children }) {
          return h("h1", { class: "title" }, children);
        }
      }

      render(h(Title, {}, "Title"), container);

      expect(
        container,
        "to satisfy",
        `<div><h1 class="title">Title</h1></div>`
      );
    });
  });

  describe("with markup that contains a component that uses an observable", () => {
    let message;

    beforeEach(() => {
      message = observable("Message from observable");
    });

    it("renders the markup to DOM", () => {
      class Title {
        render() {
          return h("h1", { class: "title" }, message());
        }
      }

      render(h(Title, {}, "Title"), container);

      expect(
        container,
        "to satisfy",
        `<div><h1 class="title">Message from observable</h1></div>`
      );
    });

    describe("when the data for the component changes", () => {
      it("re-renders", () => {
        class Title {
          render() {
            return h("h1", { class: "title", title: message() }, message());
          }
        }

        render(h(Title), container);

        expect(
          container,
          "to satisfy",
          `<div><h1 class="title" title="Message from observable">Message from observable</h1></div>`
        );

        message("Updated!");

        flush();

        expect(
          container,
          "to satisfy",
          `<div><h1 class="title" title="Updated!">Updated!</h1></div>`
        );
      });
    });

    describe("when the data subscription is updated with the props", () => {
      it("unsubscribes the old subscription and start listening for changes on the new data subscription", () => {
        const didMountSpy = sinon.spy().named("didMount");
        const didUpdateSpy = sinon.spy().named("didUpdate");

        const currentId = observable("0");
        const messages = observable({
          0: "First message",
          1: "Second message",
        });
        const currentMessage = computed(() => messages()[currentId()]);

        class Message {
          constructor() {
            this.didMount = didMountSpy;
            this.didUpdate = didUpdateSpy;
          }

          render() {
            return h("h1", { "data-id": currentId() }, currentMessage());
          }
        }

        render(h(Message), container);

        expect(
          container,
          "to satisfy",
          `<div><h1 data-id="0">First message</h1></div>`
        );

        currentId(1);
        messages({ ...messages(), 1: "Updated" });
        flush();

        expect(
          container,
          "to satisfy",
          `<div><h1 data-id="1">Updated</h1></div>`
        );

        expect([didMountSpy, didUpdateSpy], "to have calls satisfying", () => {
          didMountSpy();
          didUpdateSpy();
        });
      });
    });

    describe("when the props for the component changes", () => {
      it("re-renders", () => {
        const title = observable("This is a title");
        const message = observable("Message from observable");

        class Title {
          render({ title, children }) {
            return h("h1", { class: "title", title: title }, children);
          }
        }

        class App {
          render() {
            return h(Title, { title: title() }, message());
          }
        }

        render(h(App), container);

        expect(
          container,
          "to satisfy",
          `<div><h1 class="title" title="This is a title">Message from observable</h1></div>`
        );

        title("Updated!");
        message("Updated!");
        flush();

        expect(
          container,
          "to satisfy",
          `<div><h1 class="title" title="Updated!">Updated!</h1></div>`
        );
      });
    });

    describe("when the props and the observables for the component changes", () => {
      it("re-renders", () => {
        const title = observable("This is a title");
        const message = observable("Message from observable");

        class Title {
          render({ children }) {
            return h("h1", { class: "title", title: title() }, children);
          }
        }

        class App {
          render() {
            return h(Title, {}, message());
          }
        }

        render(h(App), container);

        expect(
          container,
          "to satisfy",
          `<div><h1 class="title" title="This is a title">Message from observable</h1></div>`
        );

        title("Updated!");
        message("Updated!");
        flush();

        expect(
          container,
          "to satisfy",
          `<div><h1 class="title" title="Updated!">Updated!</h1></div>`
        );
      });
    });

    describe("when the children is changing", () => {
      describe("and the children is keyed", () => {
        it("updates the existing DOM", () => {
          const reversed = observable(false);

          class Reversible {
            constructor() {
              this.items = ["one", "two", "three"];
            }

            render() {
              const items = reversed()
                ? this.items.slice().reverse()
                : this.items;

              return h(
                "ul",
                null,
                items.map((item) => h("li", { key: item }, item))
              );
            }
          }

          render(h(Reversible), container);

          const firstItem = container.firstElementChild.firstElementChild;

          expect(
            container,
            "to satisfy",
            `<div><ul><li>one</li><li>two</li><li>three</li></ul></div>`
          );

          reversed(true);
          flush();

          const lastItem = container.firstElementChild.lastElementChild;

          expect(firstItem, "to be", lastItem);

          expect(
            container,
            "to satisfy",
            `<div><ul><li>three</li><li>two</li><li>one</li></ul></div>`
          );
        });
      });
    });
  });

  describe("with a component containing life-cycle methods", () => {
    it("calls the life-cycle methods in the correct order", () => {
      const willMountSpy = sinon.spy().named("willMount");
      const didMountSpy = sinon.spy().named("didMount");
      const didRenderSpy = sinon.spy().named("didRender");
      const didUpdateSpy = sinon.spy().named("didUpdate");
      const willUnmountSpy = sinon.spy().named("willUnmount");

      const visible = observable(true);
      const message = observable("Hello");
      const title = observable("Title");

      class TestComponent {
        constructor() {
          this.willMount = willMountSpy;
          this.didMount = didMountSpy;
          this.didRender = didRenderSpy;
          this.didUpdate = didUpdateSpy;
          this.willUnmount = willUnmountSpy;
        }

        render({ title }) {
          return h("h1", { title: title }, message());
        }
      }

      class App {
        render() {
          return visible() ? h(TestComponent, { title: title() }) : null;
        }
      }

      render(h(App), container);

      expect(
        container,
        "to satisfy",
        `<div><h1 title="Title">Hello</h1></div>`
      );

      message("Hello world");
      flush();

      expect(
        container,
        "to satisfy",
        `<div><h1 title="Title">Hello world</h1></div>`
      );

      title("Updated title");
      flush();

      // Doesn't trigger a re-render
      title("Updated title");

      expect(
        container,
        "to satisfy",
        `<div><h1 title="Updated title">Hello world</h1></div>`
      );

      visible(false);
      flush();

      expect(container, "to satisfy", `<div><!--hidden--></div>`);

      visible(true);
      flush();

      expect(
        container,
        "to satisfy",
        `<div><h1 title="Updated title">Hello world</h1></div>`
      );

      expect(
        [willMountSpy, didMountSpy, didUpdateSpy, willUnmountSpy],
        "to have calls satisfying",
        () => {
          // mount
          willMountSpy();
          didMountSpy();
          didRenderSpy();

          // message update
          didUpdateSpy();
          didRenderSpy();

          // title update (props)
          didUpdateSpy();
          didRenderSpy();

          // visibility change
          willUnmountSpy();

          // visibility change
          willMountSpy();
          didMountSpy();
          didRenderSpy();
        }
      );
    });

    describe("when didCatch is not defined and an error is throw", () => {
      it("throws from render", () => {
        class TestComponent {
          render() {
            throw new Error("Test failure");
          }
        }

        expect(() => {
          render(h(TestComponent), store, container);
        }, "to throw");
      });
    });

    describe("when didCatch is defined", () => {
      const parentFallback = h(
        "h1",
        { "data-test-id": "parent-failure" },
        "Parent failure"
      );

      const fallback = h("h1", { "data-test-id": "failure" }, "Failure");

      it("catches errors in constructors", () => {
        class TestComponent {
          constructor() {
            throw new Error("Test failure");
          }

          render() {
            return null;
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(TestComponent))
          ),
          container
        );

        flush();

        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });

      it("catches errors in computeds", () => {
        const crashMachine = computed(() => {
          throw new Error("Test failure");
        });

        class TestComponent {
          render() {
            return h("h1", {}, crashMachine());
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(TestComponent))
          ),
          container
        );

        flush();

        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });

      it("catches errors in willMount", () => {
        class TestComponent {
          willMount() {
            throw new Error("Test failure");
          }

          render() {
            return null;
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(TestComponent))
          ),
          container
        );

        flush();

        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });

      it("catches errors in didMount", () => {
        class TestComponent {
          didMount() {
            throw new Error("Test failure");
          }

          render() {
            return null;
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(TestComponent))
          ),
          container
        );

        flush();

        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });

      it("catches errors in render", () => {
        class TestComponent {
          render() {
            throw new Error("Test failure");
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(TestComponent))
          ),
          container
        );

        flush();

        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });

      it("catches errors in didUpdate", () => {
        const message = observable("");

        class TestComponent {
          didUpdate() {
            throw new Error("Test failure");
          }

          render() {
            return h("h1", {}, message());
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(TestComponent))
          ),
          container
        );

        message("update");
        flush();

        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });

      it("catches errors in willUnmount", () => {
        const visible = observable(true);

        class TestComponent {
          willUnmount() {
            throw new Error("Test failure");
          }

          render() {
            return null;
          }
        }

        class App {
          render() {
            return h(
              ConditionalChildren,
              { visible: visible() },
              h(TestComponent)
            );
          }
        }

        render(
          h(
            ErrorBoundary,
            { name: "test-parent", fallback: parentFallback },
            h(ErrorBoundary, { name: "test", fallback }, h(App))
          ),
          container
        );

        visible(false);
        flush();
        expect(
          container,
          "to contain elements matching",
          "[data-test-id=failure]"
        );
      });
    });
  });

  describe("when using inline styles", () => {
    it("allows setting inline style on the element as a string", () => {
      render(
        h("span", { style: "background: red; color: blue" }, "I'm red"),
        container
      );

      expect(
        container,
        "to exhaustively satisfy",
        `<div><span style="background: red; color: blue">I'm red</span></div>`
      );
    });

    it("allows setting inline style on the element as an object", () => {
      render(
        h("span", { style: { background: "red", color: "blue" } }, "I'm red"),
        container
      );

      expect(
        container,
        "to exhaustively satisfy",
        `<div><span style="background: red; color: blue">I'm red</span></div>`
      );
    });

    it("allows setting inline css variables as a string", () => {
      render(h("span", { style: "--my-variable: 42" }, "I'm red"), container);

      expect(
        container,
        "to exhaustively satisfy",
        `<div><span style="--my-variable: 42">I'm red</span></div>`
      );
    });

    it("allows setting inline css variables as an object", () => {
      render(
        h("span", { style: { "--my-variable": 42 } }, "I'm red"),
        container
      );

      expect(
        container,
        "to exhaustively satisfy",
        `<div><span style="--my-variable: 42">I'm red</span></div>`
      );
    });
  });

  describe("when using ref-props", () => {
    it("calls the ref, when the element is mounted", () => {
      class TestComponent {
        setId(dom) {
          dom.setAttribute("id", "title");
        }

        render() {
          return h("section", null, h("h1", { ref: this.setId }, "Title"));
        }
      }
      render(h(TestComponent), container);

      expect(
        container,
        "to satisfy",
        '<div><section><h1 id="title">Title</h1></section></div>'
      );
    });

    describe("when the ref is replaced", () => {
      it("calls the new ref", () => {
        const refName = observable("setId");
        class TestComponent {
          setId(dom) {
            dom.setAttribute("id", "title");
          }

          setTitle(dom) {
            dom.setAttribute("title", "Hello!");
          }

          render() {
            return h(
              "section",
              null,
              h("h1", { ref: this[refName()] }, "Title")
            );
          }
        }

        render(h(TestComponent), container);

        expect(
          container,
          "to satisfy",
          '<div><section><h1 id="title">Title</h1></section></div>'
        );
        refName("setTitle");
        flush();

        expect(
          container,
          "to satisfy",
          '<div><section><h1 id="title" title="Hello!">Title</h1></section></div>'
        );
      });
    });
  });

  describe("when adding an event listener", () => {
    it("attaches the event listener to the DOM element", () => {
      const listener = sinon.spy();
      render(h("button", { onClick: listener }, "click me"), container);

      const button = container.querySelector("button");
      button.dispatchEvent(new window.CustomEvent("click"));

      expect(listener, "to have calls satisfying", () => {
        listener({ type: "click", target: button });
      });
    });

    describe("and there was an earlier event listener attached", () => {
      it("deattaches the old listener and attaches the new one", () => {
        const oldListener = sinon.spy();
        const newListener = sinon.spy();
        const listenerName = observable("old");
        class TestComponent {
          render() {
            return h(
              "button",
              { onClick: listenerName() === "old" ? oldListener : newListener },
              "click me"
            );
          }
        }

        render(h(TestComponent), container);

        const button = container.querySelector("button");
        button.dispatchEvent(new window.CustomEvent("click"));
        listenerName("new");
        flush();
        button.dispatchEvent(new window.CustomEvent("click"));

        expect([oldListener, newListener], "to have calls satisfying", () => {
          oldListener({ type: "click", target: button });
          newListener({ type: "click", target: button });
        });
      });
    });

    describe("and removing it again", () => {
      it("no longer calls the event handler", () => {
        const listener = sinon.spy();
        const enabled = observable(true);
        class TestComponent {
          render() {
            return h("button", { onClick: enabled() && listener }, "click me");
          }
        }

        render(h(TestComponent), container);

        const button = container.querySelector("button");

        button.dispatchEvent(new window.CustomEvent("click"));

        enabled(false);
        flush();

        button.dispatchEvent(new window.CustomEvent("click"));

        expect(listener, "to have calls satisfying", () => {
          listener({ type: "click", target: button });
        });
      });
    });

    describe("and removing the attribute", () => {
      it("no longer calls the event handler", () => {
        const listener = sinon.spy();
        const enabled = observable(true);
        class TestComponent {
          render() {
            return enabled()
              ? h("button", { onClick: listener }, "click me")
              : h("button", {}, "click me");
          }
        }

        render(h(TestComponent), container);

        const button = container.querySelector("button");
        button.dispatchEvent(new window.CustomEvent("click"));

        enabled(false);
        flush();

        button.dispatchEvent(new window.CustomEvent("click"));

        expect(listener, "to have calls satisfying", () => {
          listener({ type: "click", target: button });
        });
      });
    });
  });

  describe("when adding an event listener in the capturing phase", () => {
    it("attaches the event listener to the DOM element", () => {
      const listener = (e) => {
        e.stopPropagation();
      };
      const captureListener = sinon.spy();

      render(
        h(
          "div",
          { onClickCapture: captureListener },
          h("button", { onClick: listener }, "click me")
        ),
        container
      );

      const button = container.querySelector("button");
      button.dispatchEvent(new window.CustomEvent("click", { bubbles: true }));

      expect(captureListener, "to have calls satisfying", () => {
        captureListener({ type: "click", target: button });
      });
    });

    describe("and there was an earlier event listener attached", () => {
      it("deattaches the old listener and attaches the new one", () => {
        const oldListener = sinon.spy();
        const newListener = sinon.spy();
        const listenerName = observable("old");
        class TestComponent {
          render() {
            return h(
              "button",
              {
                onClickCapture:
                  listenerName() === "old" ? oldListener : newListener,
              },
              "click me"
            );
          }
        }

        render(h(TestComponent), container);

        const button = container.querySelector("button");
        button.dispatchEvent(new window.CustomEvent("click"));

        listenerName("new");
        flush();

        button.dispatchEvent(new window.CustomEvent("click"));

        expect([oldListener, newListener], "to have calls satisfying", () => {
          oldListener({ type: "click", target: button });
          newListener({ type: "click", target: button });
        });
      });
    });

    describe("and removing it again", () => {
      it("no longer calls the event handler", () => {
        const listener = sinon.spy();
        const enabled = observable(true);
        class TestComponent {
          render() {
            return h(
              "button",
              { onClickCapture: enabled() && listener },
              "click me"
            );
          }
        }

        render(h(TestComponent), container);

        const button = container.querySelector("button");
        button.dispatchEvent(new window.CustomEvent("click"));

        enabled(false);
        flush();

        button.dispatchEvent(new window.CustomEvent("click"));

        expect(listener, "to have calls satisfying", () => {
          listener({ type: "click", target: button });
        });
      });
    });

    describe("and removing the attribute", () => {
      it("no longer calls the event handler", () => {
        const listener = sinon.spy();
        const enabled = observable(true);
        class TestComponent {
          render() {
            return enabled()
              ? h("button", { onClickCapture: listener }, "click me")
              : h("button", {}, "click me");
          }
        }

        render(h(TestComponent), container);

        const button = container.querySelector("button");
        button.dispatchEvent(new window.CustomEvent("click"));

        enabled(false);
        flush();

        button.dispatchEvent(new window.CustomEvent("click"));

        expect(listener, "to have calls satisfying", () => {
          listener({ type: "click", target: button });
        });
      });
    });
  });

  describe("when adding a DOM property", () => {
    it("sets the DOM property", () => {
      render(h("input", { ".value": "My value" }), container);

      expect(container, "queried for first", "input", "to have properties", {
        value: "My value",
      });
    });

    describe("when updating the property", () => {
      it("updates the DOM property", () => {
        const value = observable("Initial value");
        class TestComponent {
          render() {
            return h("input", { ".value": value() });
          }
        }

        render(h(TestComponent), container);

        expect(container, "queried for first", "input", "to have properties", {
          value: "Initial value",
        });
        value("Updated value");
        flush();

        expect(container, "queried for first", "input", "to have properties", {
          value: "Updated value",
        });
      });
    });

    describe("when removing the property", () => {
      it("the DOM property is left unchanged", () => {
        const hasValue = observable(true);
        class TestComponent {
          render() {
            return hasValue()
              ? h("input", { ".value": "My value" })
              : h("input");
          }
        }

        render(h(TestComponent), container);

        expect(container, "queried for first", "input", "to have properties", {
          value: "My value",
        });

        hasValue(false);
        flush();

        expect(container, "queried for first", "input", "to have properties", {
          value: "My value",
        });
      });
    });
  });

  describe("with a custom component returning an array", () => {
    describe("and its only the items that changes", () => {
      it("still updates the DOM", () => {
        const number = observable(0);
        class TestComponent {
          render() {
            return [
              h("span", {}, number()),
              h("span", {}, number() + 1),
              h("span", {}, number() + 2),
            ];
          }
        }
        render(h(TestComponent), container);

        expect(
          container,
          "to satisfy",
          "<div><span>0</span><span>1</span><span>2</span></div>"
        );
        number(10);
        flush();

        expect(
          container,
          "to satisfy",
          "<div><span>10</span><span>11</span><span>12</span></div>"
        );
      });
    });

    it("renders the array to the DOM", () => {
      const items = observable(["one", "two", "three"]);
      class TestComponent {
        render() {
          return items().map((item) => h("span", {}, item));
        }
      }

      render(h(TestComponent), container);

      expect(
        container,
        "to satisfy",
        "<div><span>one</span><span>two</span><span>three</span></div>"
      );
      items(["one", "two", "three", "four"]);
      flush();

      expect(
        container,
        "to satisfy",
        "<div><span>one</span><span>two</span><span>three</span><span>four</span></div>"
      );
    });

    it("renders a keyed array to the DOM", () => {
      const items = observable(["one", "two", "three"]);
      class TestComponent {
        render() {
          return items().map((item, i) => h("span", { key: i }, item));
        }
      }

      render(h(TestComponent), container);

      expect(
        container,
        "to satisfy",
        "<div><span>one</span><span>two</span><span>three</span></div>"
      );
      items(["one", "two", "three", "four"]);
      flush();

      expect(
        container,
        "to satisfy",
        "<div><span>one</span><span>two</span><span>three</span><span>four</span></div>"
      );
    });
  });

  describe("portal", () => {
    describe("on first render", () => {
      it("renders the children in the portal target", () => {
        const target = document.createElement("div");
        class TestComponent {
          render() {
            return h(
              "Portal",
              { target: target },
              h("h1", {}, "Hello from the portal")
            );
          }
        }

        render(h(TestComponent), container);

        expect(container, "to satisfy", "<div><!--hidden--></div>");

        expect(
          target,
          "to satisfy",
          "<div><h1>Hello from the portal</h1></div>"
        );
      });

      describe("when the target is not specified", () => {
        it("renders the children in the portal document body", () => {
          const visible = observable(true);
          class TestComponent {
            render() {
              return [
                h("Portal", {}, h("h1", {}, "Hello from the portal")),
                h(
                  "section",
                  null,
                  h("Portal", {}, h("p", {}, "this is another portal"))
                ),
              ];
            }
          }

          class App {
            render() {
              return h(
                ConditionalChildren,
                { visible: visible() },
                h(TestComponent)
              );
            }
          }

          render(h(App), container);

          expect(
            container,
            "to satisfy",
            "<div><!--hidden--><section><!--hidden--></section></div>"
          );

          expect(document.body.childNodes, "to satisfy", [
            "<h1>Hello from the portal</h1>",
            "<p>this is another portal</p>",
          ]);
          visible(false);
          flush();

          expect(document.body.childNodes, "to satisfy", []);
        });
      });
    });

    describe("when the portal has children", () => {
      let target, message;
      beforeEach(() => {
        message = observable("Message from observable");
        target = document.createElement("div");
        class TestComponent {
          render() {
            return h("Portal", { target: target }, message());
          }
        }

        render(h(TestComponent), container);

        expect(container, "to satisfy", "<div><!--hidden--></div>");

        expect(target, "to satisfy", "<div>Message from observable</div>");
      });

      describe("and updating the portal children", () => {
        it("updates the portal DOM", () => {
          message("Updated portal!");
          flush();

          expect(target, "to satisfy", "<div>Updated portal!</div>");
        });
      });

      describe("and removing the children", () => {
        it("removes the portal DOM", () => {
          message(null);
          flush();

          expect(target, "to satisfy", "<div><!--hidden--></div>");
        });
      });
    });

    describe("when the portal is empty", () => {
      let target, message;
      beforeEach(() => {
        message = observable(null);
        target = document.createElement("div");
        class TestComponent {
          render() {
            return h("Portal", { target: target }, message());
          }
        }

        render(h(TestComponent), container);

        expect(container, "to satisfy", "<div><!--hidden--></div>");

        expect(target, "to satisfy", "<div><!--hidden--></div>");
      });

      describe("and setting the portal children", () => {
        it("updates the portal DOM", () => {
          message("Updated portal!");
          flush();

          expect(target, "to satisfy", "<div>Updated portal!</div>");
        });
      });

      describe("and the portal is updated to be emtpy", () => {
        it("keeps the empty portal", () => {
          message(false);
          flush();

          expect(target, "to satisfy", "<div><!--hidden--></div>");
        });
      });
    });

    describe("when the target is changed", () => {
      it("moves the children to the new target", () => {
        const target = observable("target1");
        const target1 = document.createElement("div");
        const target2 = document.createElement("div");
        class TestComponent {
          render() {
            return h(
              "Portal",
              { target: target() === "target1" ? target1 : target2 },
              "This is a portal"
            );
          }
        }

        render(h(TestComponent), container);

        expect(container, "to satisfy", "<div><!--hidden--></div>");

        expect(target1, "to satisfy", "<div>This is a portal</div>");

        target("target2");
        flush();

        expect(target1, "to satisfy", "<div></div>");

        expect(target2, "to satisfy", "<div>This is a portal</div>");
      });
    });
  });

  describe("defaultProps", () => {
    class Welcome {
      static defaultProps() {
        return { greeting: "Hello, " };
      }

      render({ greeting, name }) {
        return greeting + name;
      }
    }

    it("is used when props isn't provided", () => {
      render(h(Welcome, { name: "Jane Doe" }), container);

      expect(container, "to satisfy", "<div>Hello, Jane Doe</div>");
    });

    it("is overridable", () => {
      render(h(Welcome, { greeting: "Hi!, ", name: "Jane Doe" }), container);

      expect(container, "to satisfy", "<div>Hi!, Jane Doe</div>");
    });
  });

  describe("context", () => {
    it("allows you to pass down references to components from the initial render", () => {
      class Welcome {
        render({ name }, { greeting }) {
          return greeting + name;
        }
      }

      render(h(Welcome, { name: "Jane Doe" }), container, {
        greeting: "Hi!, ",
      });

      expect(container, "to satisfy", "<div>Hi!, Jane Doe</div>");
    });

    it("doesn't allow chaning the context", () => {
      class Welcome {
        didMount() {
          this.context.greeting = "HALLO!, ";
        }

        render({ name }, { greeting }) {
          return greeting + name;
        }
      }

      const fallback = h("div", { "data-test-id": "failed" }, "Failed");

      render(
        h(ErrorBoundary, { fallback }, h(Welcome, { name: "Jane Doe" })),
        container,
        { greeting: "Hi!, " }
      );

      flush();

      expect(container, "to contain test id", "failed");
    });

    it("allows updating the context in sub-trees", () => {
      class Welcome {
        render({ name }, { greeting }) {
          return greeting + name;
        }
      }

      render(
        h(
          "Context",
          { greeting: "Hello!, " },
          h("Context", { greeting: "Hi!, " }, h(Welcome, { name: "Jane Doe" }))
        ),
        container,
        { greeting: "Yo!, " }
      );

      expect(container, "to satisfy", "<div>Hi!, Jane Doe</div>");
    });

    it("updating the context doesn't trigger a re-render", () => {
      let renderedGreeting;
      const greeting = observable("Hi!, ");

      class Container {
        render({ children }) {
          renderedGreeting = greeting();
          return h("Context", { greeting: greeting() }, children);
        }
      }

      class Welcome {
        render({ name }, { greeting }) {
          return greeting + name;
        }
      }

      render(h(Container, null, h(Welcome, { name: "Jane Doe" })), container);

      greeting("Yo!, ");
      flush();

      expect(renderedGreeting, "to equal", "Yo!, ");

      expect(container, "to satisfy", "<div>Hi!, Jane Doe</div>");
    });
  });

  describe("when updating an observable in a child component", () => {
    let renderedChild, renderedParent;
    beforeEach(() => {
      const greeting = observable("Hi,");
      renderedChild = 0;
      renderedParent = 0;

      class Child {
        render() {
          renderedChild++;
          return `${greeting()} Jane Doe`;
        }
      }

      class Parent {
        render() {
          renderedParent++;
          return h(Child);
        }
      }

      render(h(Parent), container);

      greeting("Hello,");
      flush();
    });

    it("doesn't re-render the parent component", () => {
      expect(container, "to satisfy", `<div>Hello, Jane Doe</div>`);

      expect(renderedChild, "to be", 2);

      expect(renderedParent, "to be", 1);
    });
  });

  describe("when updating an observable from willMount", () => {
    let renderedChild, renderedParent;
    beforeEach(() => {
      const greeting = observable("Hi,", { id: "greeting" });
      renderedChild = 0;
      renderedParent = 0;

      class Child {
        render() {
          renderedChild++;
          return `${greeting()} Jane Doe`;
        }
      }

      class Parent {
        willMount() {
          greeting("Hello,");
        }

        render() {
          renderedParent++;
          return h(Child);
        }
      }

      render(h(Parent), container);

      flush();
    });

    it("doesn't re-render the component tree", () => {
      expect(container, "to satisfy", `<div>Hello, Jane Doe</div>`);

      expect(renderedChild, "to be", 1);

      expect(renderedParent, "to be", 1);
    });
  });

  describe("when a component is updated after it is unmounted", () => {
    let oddRendered, evenRendered;
    beforeEach(() => {
      oddRendered = 0;
      evenRendered = 0;
      const number = observable(0);

      class Even {
        render() {
          evenRendered++;
          return `Even number ${number()}`;
        }
      }

      class Odd {
        render() {
          oddRendered++;
          return `Odd number ${number()}`;
        }
      }

      class Parent {
        willMount() {
          number(1);
        }

        render() {
          if (number() % 2 === 0) {
            return h(Even);
          } else {
            return h(Odd);
          }
        }
      }

      render(h(Parent), container);
      flush();

      number(2);
      flush();
    });

    it("ignores the update", () => {
      expect(container, "to satisfy", `<div>Even number 2</div>`);

      expect(evenRendered, "to be", 1);

      expect(oddRendered, "to be", 1);
    });
  });

  it("renders SVGs in the correct namespace", () => {
    render(
      h(
        "svg",
        { height: "100", width: "100" },
        h("circle", {
          cx: "50",
          cy: "50",
          r: "40",
          stroke: "black",
          "stroke-width": "3",
          fill: "red",
        })
      ),
      container
    );

    const svg = container.querySelector("svg");
    const circle = container.querySelector("circle");

    expect(svg.namespaceURI, "to equal", "http://www.w3.org/2000/svg");

    expect(circle.namespaceURI, "to equal", "http://www.w3.org/2000/svg");
  });

  describe("rendering twice", () => {
    let willUnmountSpy, didMountSpy;

    beforeEach(() => {
      didMountSpy = sinon.spy().named("didMount");
      willUnmountSpy = sinon.spy().named("willUnmount");

      class TestContent {
        constructor() {
          this.didMount = didMountSpy;
          this.willUnmount = willUnmountSpy;
        }

        render() {
          return h("div", {}, "Content");
        }
      }

      render(h(TestContent, {}));
      render(h(TestContent, {}));
    });

    it("unmounts the old DOM", () => {
      expect([didMountSpy, willUnmountSpy], "to have calls satisfying", () => {
        didMountSpy();
        willUnmountSpy();
        didMountSpy();
      });
    });
  });
});
