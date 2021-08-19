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
const loggerForTest = createLoggerForTest({
  // forwardToConsole: true,
})
const firstCallParams = {
  ...TEST_PARAMS,
  logger: loggerForTest,
  serverCertificateFileUrl,
  serverCertificateAltNames: ["jsenv"],
  certificateTrustVerification: false,
  hostsFilePath,
}

await resetAllCertificateFiles()

await writeFile(hostFileUrl, ``)
await requestCertificateForLocalhost(firstCallParams)

const actual = loggerForTest.getLogs({ info: true, warn: true, error: true })
const expected = {
  infos: [
    `generating root certificate files`,
    `generating server certificate files`,
    `
some hostnames needs to be added to your hosts file
--- hostnames to add ---
jsenv
--- suggested hosts file content ---
127.0.0.1 jsenv

--- hosts file path ---
${hostsFilePath}
`,
  ],
  warns: [],
  errors: [],
}
assert({ actual, expected })
