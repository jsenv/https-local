import { createRequire } from "node:module"

import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { startServerForTest } from "../test_server.js"
import { createLoggerForTest } from "../test_logger.js"

const require = createRequire(import.meta.url)

const { chromium } = require("playwright")

const loggerForTest = createLoggerForTest({ silent: false })
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  logger: loggerForTest,
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

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(serverOrigin)
// maintenant on veut démarrer un chrome/firefox/website
// et voir ce qu'il dit/ au certificate
browser.close()
