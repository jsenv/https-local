import { assert } from "@jsenv/assert"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { getCertificateAuthorityFileUrls } from "@jsenv/https-localhost/src/internal/certificate_authority_file_urls.js"
import { TEST_PARAMS, resetAllCertificateFiles, createLoggerForTest } from "./test_helpers.js"

await resetAllCertificateFiles()
const firstCallResult = await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logLevel: "warn",
})
const loggerForSecondCall = createLoggerForTest({
  // forwardToConsole: true,
})
const secondCallResult = await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logger: loggerForSecondCall,
})

{
  // server certificate and root certificate are the same
  const actual = firstCallResult
  const expected = secondCallResult
  assert({ actual, expected })
}

{
  const rootCertificateFilePath = urlToFileSystemPath(
    getCertificateAuthorityFileUrls().rootCertificateFileUrl,
  )
  const actual = loggerForSecondCall.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      `
root certificate must be added to macOS keychain
--- suggestion ---
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic ${rootCertificateFilePath}
--- documentation ---
https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac
`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
