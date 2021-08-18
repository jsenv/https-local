/*
 * - ensure logs (info, not debug ones)
 * - certificate must not be trusted
 */

import { assert } from "@jsenv/assert"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { getCertificateAuthorityFileUrls } from "@jsenv/https-localhost/src/internal/certificate_authority_file_urls.js"
import {
  TEST_PARAMS,
  resetAllCertificateFiles,
  createLoggerForTest,
  startServerForTest,
  launchChromium,
  launchFirefox,
  launchWebkit,
  requestServerUsingBrowser,
} from "./test_helpers.js"

await resetAllCertificateFiles()
const loggerForTest = createLoggerForTest({
  // forwardToConsole: true,
})
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logger: loggerForTest,
})
const serverOrigin = await startServerForTest({
  serverCertificate,
  serverPrivateKey,
})

{
  const rootCertificateFilePath = urlToFileSystemPath(
    getCertificateAuthorityFileUrls().rootCertificateFileUrl,
  )
  const actual = loggerForTest.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: [
      `generating root certificate files`,
      `generating server certificate files`,
      // this message depends on the platform and firefox presence
      // for now keep like this but this will become dynamic
      `
root certificate must be added to macOS keychain
--- suggestion ---
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic ${rootCertificateFilePath}
--- documentation ---
https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac
`,
      `
Firefox detected, root certificate needs to be trusted in Firefox
--- suggestion ---
https://wiki.mozilla.org/PSM:Changing_Trust_Settings
`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}

{
  const browser = await launchChromium()
  try {
    await requestServerUsingBrowser({
      serverOrigin,
      browser,
    })
    throw new Error("should throw")
  } catch (e) {
    const actual = e.errorText
    const expected = "net::ERR_CERT_INVALID"
    assert({ actual, expected })
  } finally {
    browser.close()
  }
}

{
  const browser = await launchFirefox()
  try {
    await requestServerUsingBrowser({
      serverOrigin,
      browser,
    })
    throw new Error("should throw")
  } catch (e) {
    const actual = e.errorText
    const expected = "SEC_ERROR_UNKNOWN_ISSUER"
    assert({ actual, expected })
  } finally {
    browser.close()
  }
}

{
  const browser = await launchWebkit()
  try {
    await requestServerUsingBrowser({
      serverOrigin,
      browser,
    })
    throw new Error("should throw")
  } catch (e) {
    const actual = e.errorText
    const expected =
      "The certificate for this server is invalid. You might be connecting to a server that is pretending to be “localhost” which could put your confidential information at risk."
    assert({ actual, expected })
  } finally {
    browser.close()
  }
}
