import { assert } from "@jsenv/assert"

import { installCertificateAuthority, uninstallCertificateAuthority } from "@jsenv/https-localhost"
import { infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

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
        `${infoSign} You should add certificate to mac OS keychain`,
        `${infoSign} You should add certificate to Firefox`,
      ],
      windows: [],
      linux: [],
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
    mac: {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    },
    chrome: {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    },
    safari: {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    },
    firefox: {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    },
  },
}
assert({ actual, expected })
