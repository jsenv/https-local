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
      darwin: {
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
      win32: {
        windows: {
          status: "not_trusted",
          reason: "not found in windows store",
        },
        chrome: {
          status: "not_trusted",
          reason: "not found in windows store",
        },
        edge: {
          status: "not_trusted",
          reason: "not found in windows store",
        },
        firefox: {
          status: "unknown",
          reason: "not implemented on windows",
        },
      },
    }[process.platform],
  },
  secondCallLogs: {
    infos: [
      `${okSign} authority root certificate found in filesystem`,
      `Checking certificate validity...`,
      `${okSign} certificate still valid for 20 years`,
      `Detect if certificate attributes have changed...`,
      `${okSign} certificate attributes are the same`,
      ...{
        darwin: [
          "Check if certificate is trusted by mac OS...",
          `${infoSign} certificate not trusted by mac OS`,
          "Check if certificate is trusted by firefox...",
          `${infoSign} certificate not trusted by firefox`,
        ],
        win32: [
          "Check if certificate is trusted by windows...",
          `${infoSign} certificate not trusted by windows`,
          "Check if certificate is trusted by firefox...",
          `${infoSign} unable to detect if certificate is trusted by firefox (not implemented on windows)`,
        ],
        linux: [],
      }[process.platform],
    ],
    warns: [],
    errors: [],
  },
}
assert({ actual, expected })
