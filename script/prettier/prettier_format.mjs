/*
 * Executing this file format all the files using prettier config
 * See https://github.com/jsenv/jsenv-prettier-check-project
 */

import { formatWithPrettier, jsenvProjectFilesConfig } from "@jsenv/prettier-check-project"

import * as jsenvConfig from "../../jsenv.config.mjs"

formatWithPrettier({
  ...jsenvConfig,
  projectFilesConfig: {
    ...jsenvProjectFilesConfig,
    "./**/coverage/": false,
    "./**/.jsenv/": false,
    "./**/dist/": false,
  },
})
