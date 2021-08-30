import { assert } from "@jsenv/assert"

import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
  requestCertificateForLocalhost,
} from "@jsenv/local-https-certificates"
import {
  startServerForTest,
  launchChromium,
  launchFirefox,
  launchWebkit,
  requestServerUsingBrowser,
} from "@jsenv/local-https-certificates/test/test_helpers.mjs"

await uninstallCertificateAuthority({
  logLevel: "warn",
})
await installCertificateAuthority({
  logLevel: "warn",
})
const { serverCertificate, serverCertificatePrivateKey } = await requestCertificateForLocalhost({
  logLevel: "warn",
})

const serverOrigin = await startServerForTest({
  serverCertificate,
  serverCertificatePrivateKey,
})

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
    const expected = "net::ERR_CERT_AUTHORITY_INVALID"
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
    const expected = process.platform === "win32" ? undefined : "SEC_ERROR_UNKNOWN_ISSUER"
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
    const expected = {
      win32: "SSL peer certificate or SSH remote key was not OK",
      linux: "Unacceptable TLS certificate",
      darwin:
        "The certificate for this server is invalid. You might be connecting to a server that is pretending to be “localhost” which could put your confidential information at risk.",
    }[process.platform]
    assert({ actual, expected })
  } finally {
    browser.close()
  }
}
