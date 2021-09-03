import { assert } from "@jsenv/assert"

import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
} from "@jsenv/https-local"
import { okSign, infoSign } from "@jsenv/https-local/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-local/test/test_helpers.mjs"

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
const { rootCertificateFilePath } = await installCertificateAuthority({
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
      `${okSign} authority root certificate found in filesystem`,
      `Checking certificate validity...`,
      assert.matchesRegExp(/certificate expired \d seconds ago/),
      `Generating authority root certificate with a validity of 1 second...`,
      `${okSign} authority root certificate written at ${rootCertificateFilePath}`,
      ...{
        darwin: [
          `${infoSign} You should add certificate to mac keychain`,
          `${infoSign} You should add certificate to firefox`,
        ],
        win32: [
          `${infoSign} You should add certificate to windows`,
          `${infoSign} You should add certificate to firefox`,
        ],
        linux: [
          `${infoSign} You should add certificate to linux`,
          `${infoSign} You should add certificate to chrome`,
          `${infoSign} You should add certificate to firefox`,
        ],
      }[process.platform],
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
