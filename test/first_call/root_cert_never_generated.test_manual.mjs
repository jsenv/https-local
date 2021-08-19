import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import {
  resetAllCertificateFiles,
  startServerForTest,
} from "@jsenv/https-localhost/test/test_helpers.mjs"

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
