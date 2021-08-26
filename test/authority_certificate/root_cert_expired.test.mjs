import { assert } from "@jsenv/assert"

import { installCertificateAuthority, uninstallCertificateAuthority } from "@jsenv/https-localhost"
import { okSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

await uninstallCertificateAuthority({
  logLevel: "warn",
})
await installCertificateAuthority({
  logLevel: "warn",
  certificateValidityDurationInMs: 1000,
})
await new Promise((resolve) => {
  setTimeout(resolve, 2500)
})
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
const { rootCertificatePath } = await installCertificateAuthority({
  logger: loggerForSecondCall,
  certificateValidityDurationInMs: 1000,
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
      `Search existing certificate authority on filesystem...`,
      `${okSign} certificate authority found on filesystem`,
      `Checking certificate validity...`,
      assert.matchesRegExp(/certificate expired \d seconds ago/),
      `Generating authority root certificate...`,
      `${okSign} authority root certificate valid for 1 second written at ${rootCertificatePath}`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
