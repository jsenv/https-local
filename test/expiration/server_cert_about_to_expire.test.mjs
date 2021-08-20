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
  serverCertificateValidityDurationInMs: 6000,
}
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
const secondCallParams = {
  ...firstCallParams,
  logger: loggerForSecondCall,
  certificateTrustVerification: false,
  certificateHostnamesVerification: false,
  aboutToExpireRatio: 0.95,
}

await resetAllCertificateFiles()
await requestCertificateForLocalhost(firstCallParams)
await new Promise((resolve) => {
  setTimeout(resolve, 2500)
})
await requestCertificateForLocalhost(secondCallParams)

{
  const actual = loggerForSecondCall.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      assert.matchesRegExp(
        /server certificate will expire in \d seconds, it was valid during \d seconds/,
      ),
      `Generating server certificate files`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
