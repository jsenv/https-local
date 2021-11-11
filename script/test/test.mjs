/*
 * This file uses "@jsenv/core" to execute all test files.
 * See https://github.com/jsenv/jsenv-core/blob/master/docs/testing/readme.md#jsenv-test-runner
 */

import { executeTestPlan, nodeRuntime } from "@jsenv/core"

import { projectDirectoryUrl } from "../../jsenv.config.mjs"

await executeTestPlan({
  projectDirectoryUrl,
  testPlan: {
    "test/**/*.test.mjs": {
      node: {
        runtime: nodeRuntime,
      },
    },
  },
  coverage: process.argv.includes("--coverage"),
  coverageJsonFileRelativeUrl: "coverage/coverage.json",
  coverageConfig: {
    "./main.js": true,
    "./src/**/*.js": true,
  },
})
