import {
  create,
  update,
  mount,
  flush as flushDom,
} from "../src/vdom-private.js";
import { html } from "../src/html.js";
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
    return html`<h1>${children}</h1>`;
  }
}

class Box {
  render({ title, children }) {
    return html`<div className="box">
      <${Title}>${title}<//>
      <div className="body">${children}</div>
    </div>`;
  }
}

class Numbers {
  render() {
    return html`
      <li>one</li>
      <li>two</li>
      <li>three</li>
    `;
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
        [null, html`<${Childish}>Hello<//>`],
        [null, html`<${Childish}>Hello<//>`],
        [html`<${Childish}>Hello<//>`, false, html`<${Childish}>World<//>`],
        [html`<${Childish}>Hello<//>`, null, html`<${Childish}>World<//>`],
        [
          html`<${Childish}>${"Hello"}<//>`,
          html`<${Childish}>${null}<//>`,
          html`<${Childish}>${"World"}<//>`,
        ],
        [
          html`<${Childish}
            ><span key="0">${"Hello"}</span><span key="1">world</span><//
          >`,
          html`<${Childish}>${null}<span key="1">world</span><//>`,
          html`<${Childish}
            ><span key="0">${"H3110"}</span><span key="1">world</span><//
          >`,
        ],
        ["Hello", html`<img src="https://example.com" />`],
        [
          html`<img src="https://example.com" />`,
          html`<img src="https://www.example.com" />`,
        ],
        [html`<h1>Hello</h1>`, html`<h1>world</h1>`],
        [html` <h1>Hello</h1> `, html` <h2>world</h2> `],
        [
          html`
            <${Childish}>${[html` <h1>Hello</h1> `, html` <p>bla bla</p> `]}<//>
          `,
          html`<${Childish}>${[html` <h1>world</h1> `]}<//>`,
        ],
        [html`<h1>Hello</h1>`, 42],
        [html`<h1>Hello</h1>`, html`<h1>Hello ${42}</h1>`],
        [html`<h1>Hello</h1>`, html`<h2>world</h2>`],
        [html`<h1>Hello</h1>`, html`<h2>${"world"}</h2>`],
        [html`<h1>${"Hello"}</h1>`, html`<h2>${"world"}</h2>`],
        [html`<h1>${""}</h1>`, html`<h2>${"Hello"}</h2>`],
        [html`<h1>${"Hello"}</h1>`, html`<h2>${""}</h2>`],
        [html`<h1>${false}</h1>`, html`<h2>${"Hello"}</h2>`],
        [html`<h1></h1>`, html`<h2>${"Hello"}</h2>`],
        [
          html`<input type="checkbox" checked />`,
          html`<input type="checkbox" />`,
        ],
        [
          html`<input type="checkbox" />`,
          html`<input type="checkbox" checked />`,
        ],
        [
          html`<input type="checkbox" checked />`,
          html`<input type="checkbox" checked=${false} />`,
        ],
        [html`<${Title}>Hello<//>`, html`<${Title}>world<//>`],
        [html`<${Title}>Hello<//>`, html`<${Title}><span>world</span><//>`],
        [
          html`<${Title}>Hello<//>`,
          html`<${Title}>Hello <span>world</span><//>`,
        ],
        [html`<${Title}>Hello<//>`, html`<h1>Hello</h1>`],
        [
          html`<${Box} title="Hello"><em>content</em><//>`,
          html`<h1>Hello</h1>`,
        ],
        [
          html`<div><span>something</span><${Title}>Hello<//></div>`,
          html`<div>
            <span>something</span>
            <h1>Hello</h1>
          </div>`,
        ],
        [
          html`<div>
            <span>something</span>
            <h1>Hello</h1>
          </div>`,
          html`<div><span>something</span><${Title}>Hello<//></div>`,
        ],
        [
          html`<div>Hello</div>`,
          html`<span>one</span><span>two</span><span>three</span>`,
        ],
        [
          html`<span>one</span><span>two</span><span>three</span>`,
          html`<div>Hello</div>`,
        ],
        [
          html`<ul>
            <${Numbers} />
          </ul>`,
          html`<ul>
            <li>zero</li>
            <${Numbers} />
          </ul>`,
        ],
        [
          html`<ul>
            <li>zero</li>
            <${Numbers} />
          </ul>`,
          html`<ul>
            <${Numbers} />
          </ul>`,
        ],
        [
          html`<ul>
            <${Numbers} />
          </ul>`,
          html`<ul>
            <${Numbers} />
            <li>four</li>
          </ul>`,
        ],
        [
          html`<ul>
            <${Numbers} />
            <li>four</li>
          </ul>`,
          html`<ul>
            <${Numbers} />
          </ul>`,
        ],
        [html`<${Childish}><//>`, html`<${Childish}><span>0</span><//>`],
        [html`<${Childish}><span>0</span><//>`, html`<${Childish}><//>`],
        [
          html`<${Childish}><span key="0">0</span><//>`,
          html`<${Childish}><span key="0">0</span><span key="1">1</span><//>`,
        ],
        [
          html`<${Childish}><${Title} key="0">0<//><//>`,
          html`<${Childish}><${Title} key="0">0<//><${Title} key="1">1<//><//>`,
        ],
        [
          html`<ul>
            <${Numbers} key="0" />
          </ul>`,
          html`<ul>
            <${Numbers} key="0" />
            <${Childish}><li>four</li><//>
          </ul>`,
        ],
        [
          html`<ul></ul>`,
          html`<ul>
            <li>0</li>
            <li>1</li>
          </ul>`,
        ],
        [
          html`<ul>
            <li>0</li>
            <li>1</li>
          </ul>`,
          html`<ul></ul>`,
        ],
        [
          html`<ul>
            <li>0</li>
            <li>1</li>
            <li>2</li>
          </ul>`,
          html`<ul>
            <li>0</li>
            <li>1</li>
            ${false}
          </ul>`,
        ],
        [
          html`<ul>
            <li>0</li>
            <li>1</li>
            <li>2</li>
          </ul>`,
          html`<ul>
            ${null}
          </ul>`,
        ],
        [
          html`<ul>
            <li>0</li>
            <li>1</li>
            <li>2</li>
          </ul>`,
          html`<ul>
            ${[]}
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
          </ul>`,
          html`<ul>
            ${null}
          </ul>`,
        ],
        [
          html`<ul></ul>`,
          html`<ul>
            <li key="1">1</li>
            <li key="0">0</li>
          </ul>`,
        ],
        [
          html`<ul></ul>`,
          html`<ul>
            <li key="1">1</li>
            <li key="0">0</li>
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
          </ul>`,
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <${Numbers} key="3" />
          </ul>`,
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
            <${Numbers} key="3" />
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
          </ul>`,
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
          </ul>`,
          html`<ul>
            <li key="1">1</li>
            <li key="0">0</li>
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
          </ul>`,
          html`<ul>
            <li key="0">0</li>
            <li key="1">one</li>
            <li key="2">2</li>
          </ul>`,
        ],
        [
          html`<ul>
            <li key="0">0</li>
            <li key="1">1</li>
            <li key="2">2</li>
          </ul>`,
          html`<ul>
            <li key="4">4</li>
            <li key="5">5</li>
          </ul>`,
        ],
        [
          html`<div style="color: white; background-color: black">Hello</div>`,
          html`<div>Hello</div>`,
        ],
        [
          html`<div
            style="background: -moz-linear-gradient(top, #000 0%, #fff 100%)"
          >
            Hello
          </div>`,
          html`<div>Hello</div>`,
        ],
        [
          html`<div>Hello</div>`,
          html`<div style="color: white; background-color: black">Hello</div>`,
        ],
        [
          html`<div style="color: red">Hello</div>`,
          html`<div style="color: white; background-color: black">Hello</div>`,
        ],
        [
          html`<div style="color: white; background-color: black">Hello</div>`,
          html`<div style="color: red">Hello</div>`,
        ],
        [
          html`<div style="color: white; background-color: black">Hello</div>`,
          html`<div style=${{ color: "red" }}>Hello</div>`,
        ],
        [
          html`<div style="color: red">Hello</div>`,
          html`<div style=${{ color: "white", backgroundColor: "black" }}>
            Hello
          </div>`,
        ],
        [
          html`<div style=${{ color: "red" }}>Hello</div>`,
          html`<div>Hello</div>`,
        ],
        [
          html`<div>Hello</div>`,
          html`<div style=${{ color: "red" }}>Hello</div>`,
        ],
        [
          html`<div style=${{ color: "red" }}>Hello</div>`,
          html`<div style=${{ color: "white", backgroundColor: "black" }}>
            Hello
          </div>`,
        ],
        [
          html`<div style=${{ color: "white", backgroundColor: "black" }}>
            Hello
          </div>`,
          html`<div style=${{ color: "red" }}>Hello</div>`,
        ],
        [html`<div className="my-class">Hello</div>`, html`<div>Hello</div>`],
        [html`<div>Hello</div>`, html`<div class="my-class">Hello</div>`],
        [
          html`<div className="my-class">Hello</div>`,
          html`<div className=${false}>Hello</div>`,
        ],
        [
          html`<div className=${false}>Hello</div>`,
          html`<div className="my-class">Hello</div>`,
        ],
        [
          html`<div className="my-class">Hello</div>`,
          html`<div className>Hello</div>`,
        ],
        [
          html`<div className>Hello</div>`,
          html`<div className="my-class">Hello</div>`,
        ],
        [
          html`
            <svg height="100" width="100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="black"
                stroke-width="3"
                fill="red"
              />
            </svg>
          `,
          html`
            <svg height="100" width="100">
              <circle
                cx="100"
                cy="100"
                r="40"
                stroke="black"
                stroke-width="3"
                fill="red"
              />
            </svg>
          `,
        ],
        [
          html`<span>Something else</span>`,
          html`
            <svg height="100" width="100">
              <circle
                cx="100"
                cy="100"
                r="40"
                stroke="black"
                stroke-width="3"
                fill="red"
              />
            </svg>
          `,
        ],
        [
          html`
            <svg height="100" width="100">
              <circle
                cx="100"
                cy="100"
                r="40"
                stroke="black"
                stroke-width="3"
                fill="red"
              />
            </svg>
          `,
          html`<span>Something else</span>`,
        ],
        [
          {
            type: Childish,
            props: {},
            children: [
              [
                "Hello",
                html`<${Childish}><p>beautiful</p></${Childish}>`,
                "world",
              ],
            ],
          },
          html`
            <${Childish}>
              ${[
                [
                  html`<p>Hello</p>`,
                  html`<${Childish}><p>beautiful</p></${Childish}>`,
                  html`<p>world!</p>`,
                ],
              ]}
            </${Childish}>
          `,
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
