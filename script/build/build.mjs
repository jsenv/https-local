/*
 * This file uses "@jsenv/core" to convert source files into commonjs format
 * and write them into "./dist/" directory.
 *
 * Read more at https://github.com/jsenv/jsenv-core/blob/master/docs/building/readme.md#node-package-build
 */

import { buildProject, getBabelPluginMapForNode } from "@jsenv/core"

import * as jsenvConfig from "../../jsenv.config.mjs"

const isProduction = process.execArgv.some((arg) => arg.includes("--conditions=production"))

await buildProject({
  ...jsenvConfig,
  buildDirectoryRelativeUrl: isProduction ? "./dist/prod/" : "./dist/dev/",
  format: "commonjs",
  entryPointMap: {
    "./main.js": isProduction
      ? "./template_node_package.prod.cjs"
      : "./template_node_package.dev.cjs",
  },
  babelPluginMap: getBabelPluginMapForNode(),
  buildDirectoryClean: true,
})
