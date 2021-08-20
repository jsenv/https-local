import { assert } from "@jsenv/assert"
import { urlToFileSystemPath, writeFile } from "@jsenv/filesystem"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import {
  TEST_PARAMS,
  resetAllCertificateFiles,
  createLoggerForTest,
} from "@jsenv/https-localhost/test/test_helpers.mjs"

const serverCertificateFileUrl = new URL("./certificate/server.crt", import.meta.url)
const hostFileUrl = new URL("./hosts", import.meta.url)
const hostsFilePath = urlToFileSystemPath(hostFileUrl)
const params = {
  ...TEST_PARAMS,
  serverCertificateFileUrl,
  serverCertificateAltNames: ["jsenv"],
  certificateTrustVerification: false,
  hostsFilePath,
}

// required and missing
if (process.platform !== "win32") {
  const loggerForTest = createLoggerForTest({
    // forwardToConsole: true,
  })
  await resetAllCertificateFiles()
  await writeFile(hostFileUrl, ``)
  await requestCertificateForLocalhost({
    ...params,
    logger: loggerForTest,
  })

  const actual = loggerForTest.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      `Generating root certificate files`,
      `Generating server certificate files`,
      `
1 hostnames(s) must be mapped to 127.0.0.1
--- hostnames ---
jsenv
--- hosts file ---
${hostsFilePath}
--- suggested hosts file content ---
127.0.0.1 jsenv
`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}

// required and exists
if (process.platform !== "win32") {
  const loggerForTest = createLoggerForTest({
    // forwardToConsole: true,
  })
  await resetAllCertificateFiles()
  await writeFile(hostFileUrl, `127.0.0.1 jsenv`)
  await requestCertificateForLocalhost({
    ...params,
    logger: loggerForTest,
  })

  const actual = loggerForTest.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [`Generating root certificate files`, `Generating server certificate files`],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
