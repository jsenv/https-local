/**
 * This file is used when --conditions=production and code imports from "#env", for example:
 *
 * import { DEV } from "#env"
 *
 * This is configured by "imports" in package.json
 * https://github.com/jsenv/jsenv-template-node-package/blob/main/docs/production_mode/production_mode.md#production-mode
 */

export const DEV = false
