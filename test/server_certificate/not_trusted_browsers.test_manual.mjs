import { requestCertificateForLocalhost } from "@jsenv/local-https-certificates"
import {
  resetAllCertificateFiles,
  startServerForTest,
} from "@jsenv/local-https-certificates/test/test_helpers.mjs"

await resetAllCertificateFiles()
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  logLevel: "debug",
  serverCertificateFileUrl: new URL("./certificate/server.crt", import.meta.url),
  rootCertificateOrganizationName: "jsenv",
  rootCertificateOrganizationalUnitName: "https localhost",
})
const serverOrigin = await startServerForTest({
  serverCertificate,
  serverPrivateKey,
  keepAlive: true,
  port: 5000,
})
console.log(`Open ${serverOrigin} in a browser`)
