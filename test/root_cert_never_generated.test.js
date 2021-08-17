/*
 * - ensure logs (info, not debug ones)
 * - certificate must not be trusted
 */

import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
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
const loggerForTest = createLoggerForTest({ forwardToConsole: true })
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  ...TEST_PARAMS,
  logger: loggerForTest,
})
const serverOrigin = await startServerForTest({
  serverCertificate,
  serverPrivateKey,
})

{
  const actual = loggerForTest.getLogs({ info: true, warn: true, error: true })
  const expected = {
    infos: actual.infos, // todo
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
