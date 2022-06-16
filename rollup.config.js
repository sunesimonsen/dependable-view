import { terser } from "rollup-plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const plugins = [nodeResolve()];
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

const builds = ["vdom", "html", "h"].flatMap((name) => [
  {
    input: `src/${name}.js`,
    output: {
      file: `dist/dependable-view-${name}.esm.js`,
      format: "esm",
    },
    external: ["@dependable/state"],
    plugins,
  },
  {
    input: `src/${name}.js`,
    output: {
      file: `dist/dependable-view-${name}.esm.min.js`,
      format: "esm",
    },
    external: ["@dependable/state"],
    plugins: plugins.concat(minifyPlugins),
  },
]);

export default builds;
