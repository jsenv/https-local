import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { TEST_PARAMS, resetAllCertificateFiles, createLoggerForTest } from "./test_helpers.js"

await resetAllCertificateFiles()
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logLevel: "warn",
  serverCertificateValidityDurationInMs: 1000,
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
  serverCertificateValidityDurationInMs: 1000,
})

{
  const actual = loggerForSecondCall.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      `server certificate has expired 2 seconds ago, it was valid during 1 second`,
      `Generating server certificate files`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
