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
const loggerForTest = createLoggerForTest({
  // logLevel: "info",
  // forwardToConsole: true,
})
const {
  rootCertificateForgeObject,
  rootCertificatePrivateKeyForgeObject,
  rootCertificate,
  rootCertificatePrivateKey,
  rootCertificateFilePath,
  trustInfo,
} = await installCertificateAuthority({
  logger: loggerForTest,
})
const { infos, warns, errors } = loggerForTest.getLogs({ info: true, warn: true, error: true })

const actual = {
  // assert what is logged
  infos,
  warns,
  errors,
  // assert value returned
  rootCertificateForgeObject,
  rootCertificatePrivateKeyForgeObject,
  rootCertificate,
  rootCertificatePrivateKey,
  rootCertificateFilePath,
  trustInfo,
}
const expected = {
  infos: [
    `${infoSign} authority root certificate not found in filesystem`,
    `Generating authority root certificate with a validity of 20 years...`,
    `${okSign} authority root certificate written at ${actual.rootCertificateFilePath}`,
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
  rootCertificateForgeObject: assert.any(Object),
  rootCertificatePrivateKeyForgeObject: assert.any(Object),
  rootCertificate: assert.any(String),
  rootCertificatePrivateKey: assert.any(String),
  rootCertificateFilePath: assert.any(String),
  trustInfo: {
    darwin: {
      mac: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      chrome: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      firefox: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      safari: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
    },
    win32: {
      windows: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      chrome: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      edge: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      firefox: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
    },
    linux: {
      linux: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      chrome: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
      firefox: {
        status: "not_trusted",
        reason: "certificate is new and tryToTrust is disabled",
      },
    },
  }[process.platform],
}
assert({ actual, expected })
