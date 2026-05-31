import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index"],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    esbuild: { jsx: "automatic" },
  },
  externals: ["react", "react-reconciler"],
  hooks: {
    "rollup:options"(_ctx, options) {
      const plugins = Array.isArray(options.plugins) ? options.plugins : [options.plugins];
      plugins.push({
        name: "fix-bare-cjs-subpaths",
        renderChunk(code) {
          return code.replace(/from\s+(['"])react-reconciler\/constants\1/g, "from $1react-reconciler/constants.js$1");
        },
      });
      options.plugins = plugins;
    },
  },
});
