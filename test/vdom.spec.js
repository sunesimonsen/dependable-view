import {
  create,
  update,
  mount,
  flush as flushDom,
} from "../src/vdom-private.js";
import { h } from "../src/h.js";
import { flush as flushState } from "@dependable/state";
import unexpected from "unexpected";
import unexpectedDom from "unexpected-dom";
import unexpectedCheck from "unexpected-check";
import generators from "chance-generators";

const { natural, word, bool, array, shape, tree, pickone, pickset, weighted } =
  generators;

const renderIntoContainer = (vdom) => {
  const dom = mount(vdom);
  const container = document.createElement("div");
  if (Array.isArray(dom)) {
    dom.forEach((child) => {
      container.appendChild(child);
    });
  } else {
    container.appendChild(dom);
  }
  flushDom(vdom);
  return container;
};

const expect = unexpected
  .clone()
  .use(unexpectedDom)
  .use(unexpectedCheck)
  .addAssertion("<any> to update to <any+>", (expect, ...updates) => {
    const context = {
      _userContext: Object.freeze({}),
      _errorHandler: (e) => {
        throw e;
      },
      _isSvg: false,
    };
    const start = updates[0];
    const end = updates[updates.length - 1];
    const startVDom = create(start, context);
    const endVDom = create(end, context);
    const aContainer = renderIntoContainer(startVDom);
    const bContainer = renderIntoContainer(endVDom);

    let last = startVDom;
    updates.slice(1).forEach((vdom) => {
      last = update(vdom, last, context);
    });

    flushState();

    expect(aContainer, "to equal", bContainer);
  });

class Title {
  render({ children }) {
    return h("h1", {}, children);
  }
}

class Box {
  render({ title, children }) {
    return h(
      "div",
      { className: "box" },
      h(Title, {}, title),
      h("div", { className: "body" }, children)
    );
  }
}
class Numbers {
  render() {
    return [h("li", {}, "one"), h("li", {}, "two"), h("li", {}, "three")];
  }
}

class Childish {
  render({ children }) {
    return children;
  }
}

describe("vdom", () => {
  describe("update", () => {
    it("create(b) === update(b, create(a))", () => {
      [
        [false, false],
        [10, false],
        [20, 10],
        ["", "hello"],
        [null, "hello"],
        ["hello", ""],
        ["Hello", "world"],
        ["Hello", 42],
        ["Hello", 42, 43],
        ["Hello", false, "World"],
        [null, h(Childish, {}, "Hello")],
        [null, h(Childish, {}, "Hello")],
        [h(Childish, {}, "Hello"), false, h(Childish, {}, "World")],
        [h(Childish, {}, "Hello"), null, h(Childish, {}, "World")],
        [
          h(Childish, {}, "Hello"),
          h(Childish, {}, null),
          h(Childish, {}, "World"),
        ],
        [
          h(
            Childish,
            {},
            h("span", { key: "0" }, "Hello"),
            h("span", { key: "1" }, "world")
          ),
          h(Childish, {}, null, h("span", { key: "1" }, "world")),
          h(
            Childish,
            {},
            h("span", { key: "0" }, "H3110"),
            h("span", { key: "1" }, "world")
          ),
        ],
        ["Hello", h("img", { src: "https://example.com" })],
        [
          h("img", { src: "https://example.com" }),
          h("img", { src: "https://www.example.com" }),
        ],
        [h("h1", {}, "Hello"), h("h1", {}, "world")],
        [
          [" ", h("h1", {}, "Hello"), " "],
          [" ", h("h2", {}, "world"), " "],
        ],
        [
          h(Childish, {}, [
            [" ", h("h1", {}, "Hello"), " "],
            [" ", h("p", {}, "bla bla"), " "],
          ]),
          h(Childish, {}, [[" ", h("h1", {}, "world"), " "]]),
        ],
        [h("h1", {}, "Hello"), 42],
        [h("h1", {}, "Hello"), h("h1", {}, "Hello ", 42)],
        [h("h1", {}, "Hello"), h("h2", {}, "world")],
        [h("h1", {}, "Hello"), h("h2", {}, "world")],
        [h("h1", {}, "Hello"), h("h2", {}, "world")],
        [h("h1", {}, ""), h("h2", {}, "Hello")],
        [h("h1", {}, "Hello"), h("h2", {}, "")],
        [h("h1", {}, false), h("h2", {}, "Hello")],
        [h("h1"), h("h2", {}, "Hello")],
        [
          h("input", { type: "checkbox", checked: true }),
          h("input", { type: "checkbox" }),
        ],
        [
          h("input", { type: "checkbox" }),
          h("input", { type: "checkbox", checked: true }),
        ],
        [
          h("input", { type: "checkbox", checked: true }),
          h("input", { type: "checkbox", checked: false }),
        ],
        [h(Title, {}, "Hello"), h(Title, {}, "world")],
        [h(Title, {}, "Hello"), h(Title, {}, h("span", {}, "world"))],
        [h(Title, {}, "Hello"), h(Title, {}, "Hello ", h("span", {}, "world"))],
        [h(Title, {}, "Hello"), h("h1", {}, "Hello")],
        [
          h(Box, { title: "Hello" }, h("em", {}, "content")),
          h("h1", {}, "Hello"),
        ],
        [
          h("div", {}, h("span", {}, "something"), h(Title, {}, "Hello")),
          h("div", {}, h("span", {}, "something"), h("h1", {}, "Hello")),
        ],
        [
          h("div", {}, h("span", {}, "something"), h("h1", {}, "Hello")),
          h("div", {}, h("span", {}, "something"), h(Title, {}, "Hello")),
        ],
        [
          h("div", {}, "Hello"),
          [h("span", {}, "one"), h("span", {}, "two"), h("span", {}, "three")],
        ],
        [
          [h("span", {}, "one"), h("span", {}, "two"), h("span", {}, "three")],
          h("div", {}, "Hello"),
        ],
        [h("ul", {}, h(Numbers)), h("ul", {}, h("li", {}, "zero"), h(Numbers))],
        [h("ul", {}, h("li", {}, "zero"), h(Numbers)), h("ul", {}, h(Numbers))],
        [h("ul", {}, h(Numbers)), h("ul", {}, h(Numbers), h("li", {}, "four"))],
        [h("ul", {}, h(Numbers), h("li", {}, "four")), h("ul", {}, h(Numbers))],
        [h(Childish), h(Childish, {}, h("span", {}, "0"))],
        [h(Childish, {}, h("span", {}, "0")), h(Childish)],
        [
          h(Childish, {}, h("span", { key: "0" }, "0")),
          h(
            Childish,
            {},
            h("span", { key: "0" }, "0"),
            h("span", { key: "1" }, "1")
          ),
        ],
        [
          h(Childish, {}, h(Title, { key: "0" }, "0")),
          h(
            Childish,
            {},
            h(Title, { key: "0" }, "0"),
            h(Title, { key: "1" }, "1")
          ),
        ],
        [
          h("ul", {}, h(Numbers, { key: "0" })),
          h(
            "ul",
            {},
            h(Numbers, { key: "0" }),
            h(Childish, {}, h("li", {}, "four"))
          ),
        ],
        [h("ul"), h("ul", {}, h("li", {}, "0"), h("li", {}, "1"))],
        [h("ul", {}, h("li", {}, "0"), h("li", {}, "1")), h("ul")],
        [
          h("ul", {}, h("li", {}, "0"), h("li", {}, "1"), h("li", {}, "2")),
          h("ul", {}, h("li", {}, "0"), h("li", {}, "1"), false),
        ],
        [
          h("ul", {}, h("li", {}, "0"), h("li", {}, "1"), h("li", {}, "2")),
          h("ul", {}, null),
        ],
        [
          h("ul", {}, h("li", {}, "0"), h("li", {}, "1"), h("li", {}, "2")),
          h("ul"),
        ],
        [
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2")
          ),
          h("ul", {}, null),
        ],
        [
          h("ul"),
          h("ul", {}, h("li", { key: "1" }, "1"), h("li", { key: "0" }, "0")),
        ],
        [
          h("ul"),
          h("ul", {}, h("li", { key: "1" }, "1"), h("li", { key: "0" }, "0")),
        ],
        [
          h("ul", {}, h("li", { key: "0" }, "0"), h("li", { key: "1" }, "1")),
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2")
          ),
        ],
        [
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h(Numbers, { key: "3" })
          ),
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2"),
            h(Numbers, { key: "3" })
          ),
        ],
        [
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2")
          ),
          h("ul", {}, h("li", { key: "0" }, "0"), h("li", { key: "1" }, "1")),
        ],
        [
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2")
          ),
          h("ul", {}, h("li", { key: "1" }, "1"), h("li", { key: "0" }, "0")),
        ],
        [
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2")
          ),
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "one"),
            h("li", { key: "2" }, "2")
          ),
        ],
        [
          h(
            "ul",
            {},
            h("li", { key: "0" }, "0"),
            h("li", { key: "1" }, "1"),
            h("li", { key: "2" }, "2")
          ),
          h("ul", {}, h("li", { key: "4" }, "4"), h("li", { key: "5" }, "5")),
        ],
        [
          h("div", { style: "color: white; background-color: black" }, "Hello"),
          h("div", {}, "Hello"),
        ],
        [
          h(
            "div",
            {
              style:
                "background: -moz-linear-gradient(top, #000 0%, #fff 100%)",
            },
            "Hello"
          ),
          h("div", {}, "Hello"),
        ],
        [
          h("div", {}, "Hello"),
          h("div", { style: "color: white; background-color: black" }, "Hello"),
        ],
        [
          h("div", { style: "color: red" }, "Hello"),
          h("div", { style: "color: white; background-color: black" }, "Hello"),
        ],
        [
          h("div", { style: "color: white; background-color: black" }, "Hello"),
          h("div", { style: "color: red" }, "Hello"),
        ],
        [
          h("div", { style: "color: white; background-color: black" }, "Hello"),
          h("div", { style: { color: "red" } }, "Hello"),
        ],
        [
          h("div", { style: "color: red" }, "Hello"),
          h(
            "div",
            { style: { color: "white", backgroundColor: "black" } },
            "Hello"
          ),
        ],
        [h("div", { style: { color: "red" } }, "Hello"), h("div", {}, "Hello")],
        [h("div", {}, "Hello"), h("div", { style: { color: "red" } }, "Hello")],
        [
          h("div", { style: { color: "red" } }, "Hello"),
          h("div", { style: { color: "red" } }, "Hello"),
        ],
        [
          h("div", { style: { color: "red" } }, "Hello"),
          h(
            "div",
            { style: { color: "white", backgroundColor: "black" } },
            "Hello"
          ),
        ],
        [
          h(
            "div",
            { style: { color: "white", backgroundColor: "black" } },
            "Hello"
          ),
          h("div", { style: { color: "red" } }, "Hello"),
        ],
        [h("div", { className: "my-class" }, "Hello"), h("div", {}, "Hello")],
        [h("div", {}, "Hello"), h("div", { class: "my-class" }, "Hello")],
        [
          h("div", { className: "my-class" }, "Hello"),
          h("div", { className: false }, "Hello"),
        ],
        [
          h("div", { className: false }, "Hello"),
          h("div", { className: "my-class" }, "Hello"),
        ],
        [
          h("div", { className: "my-class" }, "Hello"),
          h("div", { className: true }, "Hello"),
        ],
        [
          h("div", { className: true }, "Hello"),
          h("div", { className: "my-class" }, "Hello"),
        ],
        [
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
          h(
            "svg",
            { height: "100", width: "100" },
            h("circle", {
              cx: "100",
              cy: "100",
              r: "40",
              stroke: "black",
              "stroke-width": "3",
              fill: "red",
            })
          ),
        ],
        [
          h("span", {}, "Something else"),
          h(
            "svg",
            { height: "100", width: "100" },
            h("circle", {
              cx: "100",
              cy: "100",
              r: "40",
              stroke: "black",
              "stroke-width": "3",
              fill: "red",
            })
          ),
        ],
        [
          h(
            "svg",
            { height: "100", width: "100" },
            h("circle", {
              cx: "100",
              cy: "100",
              r: "40",
              stroke: "black",
              "stroke-width": "3",
              fill: "red",
            })
          ),
          h("span", {}, "Something else"),
        ],
        [
          {
            type: Childish,
            props: {},
            children: [
              ["Hello", h(Childish, {}, h("p", {}, "beautiful")), "world"],
            ],
          },
          h(Childish, {}, [
            [
              h("p", {}, "Hello"),
              h(Childish, {}, h("p", {}, "beautiful")),
              h("p", {}, "world!"),
            ],
          ]),
        ],
      ].forEach(([a, ...updates]) => {
        expect(a, "to update to", ...updates);
      });
    });

    it("create(b) === update(b, create(a)) for random updates", () => {
      const leaf = pickone([natural, word, bool]);

      const type = pickone(["div", "span", "h1", "portal", Childish]);

      const styles = pickone([
        shape({
          height: natural.map((n) => `${n}px`),
          width: natural.map((n) => `${n}px`),
        }),
        "width: 42",
        "height: 42; width: 42",
        "border: thin solid red;",
      ]);

      const handlers = pickone([() => {}, () => {}, undefined]);

      const entries = pickset([
        [word.map((w) => `data-${w}`), word],
        ["style", styles],
        ["onClick", handlers],
        ["ref", handlers],
        ["disabled", bool],
        [".myProp", pickone([word, bool, undefined])],
      ]);

      const props = entries.map((arr) => Object.fromEntries(arr));

      const maybeKeyed = (children, chance) => {
        if (chance.bool()) return children;

        const indexes = chance.shuffle(children.map((_, i) => i));

        const result = children.map((c, i) =>
          c && typeof c === "object" && c.type
            ? { ...c, props: { ...c.props, key: indexes[i] } }
            : { type: "div", props: { key: indexes[i] }, children: [c] }
        );

        return result;
      };

      const mapBranches = (tree, mapper) =>
        Array.isArray(tree)
          ? mapper(tree.map((child) => mapBranches(child, mapper)))
          : tree;

      const htmlTree = weighted([
        [
          tree(leaf, { max: 10 }).map((tree, chance) =>
            mapBranches(tree, (children) => ({
              _type: type,
              props,
              children: maybeKeyed(children, chance),
            }))
          ),
          5,
        ],
        [leaf, 1],
      ]);

      expect(
        (a, updates) => {
          expect(a, "to update to", ...updates);
        },
        "to be valid for all",
        htmlTree,
        array(htmlTree, { min: 1, max: 10 })
      );
    });
  });
});
