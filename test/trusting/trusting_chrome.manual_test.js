import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import { resetCertificateAuhtorityFiles } from "@jsenv/https-localhost/src/localhost_certificate.js"
import { startServerForTest } from "../test_server.js"

await resetCertificateAuhtorityFiles()
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
