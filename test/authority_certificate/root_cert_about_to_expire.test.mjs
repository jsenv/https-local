import { assert } from "@jsenv/assert"

import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
} from "@jsenv/local-https-certificates"
import { okSign, infoSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/local-https-certificates/test/test_helpers.mjs"

await uninstallCertificateAuthority({
  logLevel: "warn",
})
await installCertificateAuthority({
  logLevel: "warn",
  certificateValidityDurationInMs: 6000,
})
await new Promise((resolve) => {
  setTimeout(resolve, 1500)
})
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
const { rootCertificateFilePath } = await installCertificateAuthority({
  logger: loggerForSecondCall,
  certificateValidityDurationInMs: 6000,
  aboutToExpireRatio: 0.95,
})

{
  const { infos, warns, errors } = loggerForSecondCall.getLogs({
    info: true,
    warn: true,
    error: true,
  })
  const actual = { infos, warns, errors }
  const expected = {
    infos: [
      `${okSign} authority root certificate found in filesystem`,
      `Checking certificate validity...`,
      assert.matchesRegExp(/certificate will expire in \d seconds/),
      `Generating authority root certificate with a validity of 6 seconds...`,
      `${okSign} authority root certificate written at ${rootCertificateFilePath}`,
      ...{
        darwin: [
          `${infoSign} You should add certificate to mac OS keychain`,
          `${infoSign} You should add certificate to Firefox`,
        ],
        windows: [],
        linux: [],
      }[process.platform],
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
