import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { TEST_PARAMS, resetAllCertificateFiles, createLoggerForTest } from "./test_helpers.js"

await resetAllCertificateFiles()
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logLevel: "warn",
  serverCertificateValidityDurationInMs: 10000, // 10 seconds
})
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
await new Promise((resolve) => {
  setTimeout(resolve, 9600)
})
await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logger: loggerForSecondCall,
  certificateTrustVerification: false,
})

{
  const actual = loggerForSecondCall.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
