/*
 * This file uses "@jsenv/core" to execute all test files.
 * See https://github.com/jsenv/jsenv-core/blob/master/docs/testing/readme.md#jsenv-test-runner
 */

import { executeTestPlan, nodeChildProcess } from "@jsenv/core"

await executeTestPlan({
  rootDirectoryUrl: new URL("../../", import.meta.url),
  testPlan: {
    "tests/**/*.test.mjs": {
      node: {
        runtime: nodeChildProcess,
      },
    },
  },
  coverage: process.argv.includes("--coverage"),
})
