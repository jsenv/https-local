import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { TEST_PARAMS, resetAllCertificateFiles, createLoggerForTest } from "./test_helpers.mjs"

await resetAllCertificateFiles()
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logLevel: "warn",
  serverCertificateValidityDurationInMs: 6000,
})
await new Promise((resolve) => {
  setTimeout(resolve, 2500)
})
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logger: loggerForSecondCall,
  certificateTrustVerification: false,
  serverCertificateValidityDurationInMs: 5000,
  aboutToExpireRatio: 0.95,
})

{
  const actual = loggerForSecondCall.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      assert.matchesRegExp(
        /server certificate will expire in \d seconds, it was valid during \d seconds/,
      ),
      `generating server certificate files`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
