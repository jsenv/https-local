/*
 * This file is executed by "upload coverage" step in .github/workflows/main.yml
 * It will upload coverage generated during tests in coverage/coverage_final.json
 * to codecov.io
 * See https://github.com/jsenv/jsenv-template-node-package/blob/main/docs/coverage/coverage.md#coverage
 */

import { uploadCoverage } from "@jsenv/codecov-upload"

import * as jsenvConfig from "../../jsenv.config.mjs"

uploadCoverage({
  ...jsenvConfig,
})
