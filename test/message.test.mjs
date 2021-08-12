/*
 * This file test the public exports of "@jsenv/template-node-package"
 * - It illustrates how to test code
 * - It illustrates how to use top level await to test code
 * - It illustrates how to test code specific to dev/production
 */

import { assert } from "@jsenv/assert"

import { getMessageAsync } from "@jsenv/template-node-package"

const isProduction = process.execArgv.some((arg) => arg.includes("--conditions=production"))
const messageExpected = isProduction ? "Hello prod!" : "Hello dev!"

// Test is commented to artificially decrease coverage
// De-commenting test below puts coverage back to 100%
// {
//   const actual = getMessage()
//   const expected = messageExpected
//   assert({ actual, expected })
// }

{
  const actual = await getMessageAsync()
  const expected = messageExpected
  assert({ actual, expected })
}

console.log("passed")
