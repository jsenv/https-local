import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import {
  TEST_PARAMS,
  resetAllCertificateFiles,
  createLoggerForTest,
} from "@jsenv/https-localhost/test/test_helpers.mjs"

const serverCertificateFileUrl = new URL("./certificate/server.crt", import.meta.url)
const firstCallParams = {
  ...TEST_PARAMS,
  logLevel: "warn",
  serverCertificateFileUrl,
}
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
const secondCallParams = {
  ...firstCallParams,
  logger: loggerForSecondCall,
}

await resetAllCertificateFiles()
const firstCallResult = await requestCertificateForLocalhost(firstCallParams)
const secondCallResult = await requestCertificateForLocalhost(secondCallParams)

{
  // server certificate and root certificate are the same
  const actual = firstCallResult
  const expected = secondCallResult
  assert({ actual, expected })
}
