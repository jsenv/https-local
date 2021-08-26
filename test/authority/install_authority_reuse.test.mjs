import { assert } from "@jsenv/assert"

import { installCertificateAuthority, uninstallCertificateAuthority } from "@jsenv/https-localhost"
import { infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

await uninstallCertificateAuthority({
  logLevel: "warn",
})
const firstCallReturnValue = await installCertificateAuthority({
  logLevel: "warn",
})
const loggerForTest = createLoggerForTest({
  // logLevel: "info",
  // forwardToConsole: true,
})
const secondCallReturnValue = await installCertificateAuthority({
  logger: loggerForTest,
})
const secondCallLogs = loggerForTest.getLogs({ info: true, warn: true, error: true })
const sameCertificate =
  firstCallReturnValue.rootCertificate === secondCallReturnValue.rootCertificate

const actual = {
  sameCertificate,
  secondCallReturnValue,
  secondCallLogs,
}
const expected = {
  sameCertificate: true,
  secondCallReturnValue: {
    rootCertificateForgeObject: assert.any(Object),
    rootCertificatePrivateKeyForgeObject: assert.any(Object),
    rootCertificate: assert.any(String),
    rootCertificatePrivateKey: assert.any(String),
    rootCertificatePath: assert.any(String),
    trustInfo: {
      mac: {
        status: "not_trusted",
        reason: "not found in mac keychain",
      },
      chrome: {
        status: "not_trusted",
        reason: "not found in mac keychain",
      },
      safari: {
        status: "not_trusted",
        reason: "not found in mac keychain",
      },
      firefox: {
        status: "not_trusted",
        reason: "missing in some firefox nss database file",
      },
    },
  },
  secondCallLogs: {
    infos: [
      `Search existing certificate authority on filesystem...`,
      `${okSign} certificate authority found on filesystem`,
      `Checking certificate validity...`,
      `${okSign} certificate valid for 20 years`,
      `Detect if certificate attributes have changed...`,
      `${okSign} certificate attributes are the same`,
      "Check if certificate is trusted by mac OS...",
      `${infoSign} certificate not trusted by mac OS`,
      "Check if certificate is trusted by Firefox...",
      `${infoSign} certificate not trusted by Firefox`,
    ],
    warns: [],
    errors: [],
  },
}
assert({ actual, expected })
