import { assert } from "@jsenv/assert"

import { installCertificateAuthority, uninstallCertificateAuthority } from "@jsenv/https-localhost"
import { infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { TEST_PARAMS, createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

const loggerForTest = createLoggerForTest({
  // logLevel: "info",
  // forwardToConsole: true,
})
const params = {
  ...TEST_PARAMS,
  logger: loggerForTest,
}

await uninstallCertificateAuthority()
const returnValue = await installCertificateAuthority(params)
const logs = loggerForTest.getLogs({ info: true, warn: true, error: true })

const actual = {
  returnValue,
  logs,
}
const expected = {
  returnValue: {
    rootForgeCertificate: assert.any(Object),
    rootForgePrivateKey: assert.any(Object),
    rootCertificate: assert.any(String),
    rootPrivateKey: assert.any(String),
    rootCertificatePath: assert.any(String),
    trustInfo: {
      mac: {
        status: "not_trusted",
        reason: "tryToTrust disabled",
      },
      chrome: {
        status: "not_trusted",
        reason: "tryToTrust disabled",
      },
      safari: {
        status: "not_trusted",
        reason: "tryToTrust disabled",
      },
      firefox: {
        status: "not_trusted",
        reason: "tryToTrust disabled",
      },
    },
  },
  logs: {
    infos: [
      `Detect existing certificate authority...`,
      `${infoSign} no certificate authority found`,
      `Generating authority certificate...`,
      `${okSign} authority certificate written at ${actual.returnValue.rootCertificatePath}`,
    ],
    warns: [],
    errors: [],
  },
}
assert({ actual, expected })
