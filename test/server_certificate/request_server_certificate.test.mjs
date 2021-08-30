import { assert } from "@jsenv/assert"

import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
  requestCertificateForLocalhost,
} from "@jsenv/local-https-certificates"
import { okSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/local-https-certificates/test/test_helpers.mjs"

const loggerDuringTest = createLoggerForTest({
  // forwardToConsole: true,
})

await uninstallCertificateAuthority({
  logLevel: "warn",
})
await installCertificateAuthority({
  logLevel: "warn",
})
const returnValue = await requestCertificateForLocalhost({
  // logLevel: "warn",
  logger: loggerDuringTest,
})

{
  const { debugs, infos, warns, errors } = loggerDuringTest.getLogs({
    debug: true,
    info: true,
    warn: true,
    error: true,
  })
  const actual = {
    debugs,
    infos,
    warns,
    errors,
    returnValue,
  }
  const expected = {
    debugs: [
      `Restoring certificate authority from filesystem...`,
      `${okSign} certificate authority restored from filesystem`,
      "Generating server certificate...",
      `${okSign} server certificate generated, it will be valid for 1 year`,
    ],
    infos: [],
    warns: [],
    errors: [],
    returnValue: {
      serverCertificate: assert.any(String),
      serverCertificatePrivateKey: assert.any(String),
      rootCertificateFilePath: assert.any(String),
    },
  }
  assert({ actual, expected })
}
