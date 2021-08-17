import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { TEST_PARAMS, resetAllCertificateFiles, createLoggerForTest } from "./test_helpers.js"

await resetAllCertificateFiles()
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logLevel: "warn",
  serverCertificateValidityDurationInMs: 5000, // 1 seconds
})
await new Promise((resolve) => {
  setTimeout(resolve, 1500)
})
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logger: loggerForSecondCall,
  certificateTrustVerification: false,
  aboutToExpireRatio: 0.95,
})

{
  const actual = loggerForSecondCall.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      `server certificate will expire in 2 seconds, it was valid during 2 seconds`,
      `Generating server certificate files`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
