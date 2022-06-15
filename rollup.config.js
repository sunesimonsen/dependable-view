import { terser } from "rollup-plugin-terser";

const plugins = [];
const minifyPlugins = [
  terser({
    compress: true,
    nameCache: {
      vars: {},
      props: {
        props: {},
      },
    },
    mangle: {
      reserved: [],
      properties: {
        regex: /^_/,
      },
    },
  }),
];

export default [
  {
    input: "src/view.js",
    output: {
      file: "dist/dependable-view.esm.js",
      format: "esm",
    },
    plugins,
  },
  {
    input: "src/view.js",
    output: {
      file: "dist/dependable-view.esm.min.js",
      format: "esm",
    },
    plugins: plugins.concat(minifyPlugins),
  },
];
