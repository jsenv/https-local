import { assert } from "@jsenv/assert"

import { installCertificateAuthority, uninstallCertificateAuthority } from "@jsenv/https-localhost"
import { okSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

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
      `${okSign} certificate authority found on filesystem`,
      `Checking certificate validity...`,
      assert.matchesRegExp(/certificate will expire in \d seconds/),
      `Generating authority root certificate...`,
      `${okSign} authority root certificate valid for 6 seconds written at ${rootCertificateFilePath}`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
