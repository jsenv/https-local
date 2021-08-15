import { assert } from "@jsenv/assert"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { resetCertificateAuhtorityFiles } from "@jsenv/https-localhost/src/localhost_certificate.js"
import {
  createLoggerForTest,
  startServerForTest,
  launchChromium,
  requestServerUsingBrowser,
} from "../test_helpers.js"

await resetCertificateAuhtorityFiles()
const loggerForTest = createLoggerForTest({ forwardToConsole: true })
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  logger: loggerForTest,
  serverCertificateFileUrl: new URL("./certificate/server.crt", import.meta.url),
  rootCertificateOrganizationName: "jsenv",
  rootCertificateOrganizationalUnitName: "https localhost",

  // TODO
  // commonName: "https://github.com/jsenv/https-certificate",
  // countryName: "FR",
  // stateOrProvinceName: "Alpes Maritimes",
  // localityName: "Valbonne",
  // validityInYears: 1,

  // TODO
  // serverCertificateValidityInDays: 1,
})
const serverOrigin = await startServerForTest({
  serverCertificate,
  serverPrivateKey,
})
const browser = await launchChromium()

// certificate is not trusted without a manual action from us
// opening chrome results in ERR_CERT_INVALID
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
}

browser.close()
