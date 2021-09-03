import { assert } from "@jsenv/assert"

import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
} from "@jsenv/https-local"
import {
  infoSign,
  okSign,
  failureSign,
} from "@jsenv/https-local/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-local/test/test_helpers.mjs"

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
const secondCallLogs = loggerForTest.getLogs({
  info: true,
  warn: true,
  error: true,
})
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
          status: "unknown",
          reason: `"nss" is not installed`,
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
      linux: {
        linux: {
          status: "not_trusted",
          reason: "not found in linux store",
        },
        chrome: {
          status: "unknown",
          reason: `"libnss3-tools" is not installed`,
        },
        firefox: {
          status: "unknown",
          reason: `"libnss3-tools" is not installed`,
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
          "Check if certificate is in mac keychain...",
          `${infoSign} certificate not found in mac keychain`,
          "Check if certificate is in firefox...",
          `${failureSign} cannot check if certificate is in firefox
--- reason ---
"nss" is not installed`,
        ],
        win32: [
          "Check if certificate is in windows...",
          `${infoSign} certificate not found in windows`,
          "Check if certificate is in firefox...",
          `${infoSign} cannot check if certificate is in firefox (not implemented on windows)`,
        ],
        linux: [
          "Check if certificate is in linux...",
          `${infoSign} certificate not in linux`,
          "Check if certificate is in chrome...",
          `${failureSign} cannot check if certificate is in chrome
--- reason ---
"libnss3-tools" is not installed`,
          "Check if certificate is in firefox...",
          `${failureSign} cannot check if certificate is in firefox
--- reason ---
"libnss3-tools" is not installed`,
        ],
      }[process.platform],
    ],
    warns: [],
    errors: [],
  },
}
assert({ actual, expected })
