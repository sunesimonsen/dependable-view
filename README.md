# @dependable/view

[![Checks](https://github.com/sunesimonsen/dependable-view/workflows/CI/badge.svg)](https://github.com/sunesimonsen/dependable-view/actions?query=workflow%3ACI+branch%3Amain)
[![Bundle Size](https://img.badgesize.io/https:/unpkg.com/@dependable/view/dist/dependable-view-h.esm.min.js?label=h%20gzip&compression=gzip)](https://unpkg.com/@dependable/view/dist/dependable-view-h.esm.min.js)
[![Bundle Size](https://img.badgesize.io/https:/unpkg.com/@dependable/view/dist/dependable-view-vdom.esm.min.js?label=vdom%20gzip&compression=gzip)](https://unpkg.com/@dependable/view/dist/dependable-view-vdom.esm.min.js)

A small VDOM based view layer for [@dependable/state](https://github.com/sunesimonsen/dependable-state)

- Easy learning curve
- Tiny, less than 3KB
- Depends only on [@dependable/state](https://github.com/sunesimonsen/dependable-state)
- Allows multiple versions of the library in the page
- Batches updates

[API documentation](https://dependable-view-api.surge.sh/modules/index.html)

## Install

```sh
# npm
npm install --save @dependable/view

# yarn
npm add @dependable/view
```

## Usage

Let's make a silly todo list to see how things work:

```js
import { render, html } from "@dependable/view";
import { observable, computed } from "@dependable/state";

// The todo state
const todos = observable([]);
const todoCount = computed(() => todos().length);

// Observable for the input text
const text = observable("");
const setText = (e) => text(e.target.value);

// Add the current todo text to the list
const addTodo = () => {
  todos([...todos(), text()]);
  text("");
};

class TodoInput {
  render() {
    return html`<input .value=${text()} onInput=${setText} />`;
  }
}

class TodoList {
  render() {
    return html`
      <form onSubmit=${addTodo} action="javascript:">
        <label>
          Add Todo
          <${TodoInput} />
        </label>
        <button type="submit">Add</button>
        <ul>
          ${todos().map((text) => html`<li>${text}</li>`)}
        </ul>
      </form>
      Number of todos: ${todoCount()}
    `;
  }
}

render(html`<${TodoList} />`);
```

As you can see, we can model the global application state outside of components.
This separates the logic from the views and allows for easier testing for the
logic.

The render methods just uses the observables and computeds and is re-rendered with they change.

## Acknowledgements

The VDOM is heavily inspired by https://preactjs.com/

## License

MIT License

Copyright (c) 2022 Sune Simonsen sune@we-knowhow.dk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
