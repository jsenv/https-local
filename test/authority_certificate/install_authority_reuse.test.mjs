import { assert } from "@jsenv/assert"

import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
} from "@jsenv/local-https-certificates"
import { infoSign, okSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/local-https-certificates/test/test_helpers.mjs"

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
    rootCertificateFilePath: assert.any(String),
    trustInfo: {
      mac: {
        status: "not_trusted",
        reason: "certificate not found in mac keychain",
      },
      chrome: {
        status: "not_trusted",
        reason: "certificate not found in mac keychain",
      },
      firefox: {
        status: "not_trusted",
        reason: "missing in some firefox nss database file",
      },
      safari: {
        status: "not_trusted",
        reason: "certificate not found in mac keychain",
      },
    },
  },
  secondCallLogs: {
    infos: [
      `${okSign} authority root certificate found in filesystem`,
      `Checking certificate validity...`,
      `${okSign} certificate still valid for 20 years`,
      `Detect if certificate attributes have changed...`,
      `${okSign} certificate attributes are the same`,
      "Check if certificate is trusted by mac OS...",
      `${infoSign} certificate not trusted by mac OS`,
      "Check if certificate is trusted by firefox...",
      `${infoSign} certificate not trusted by firefox`,
    ],
    warns: [],
    errors: [],
  },
}
assert({ actual, expected })
