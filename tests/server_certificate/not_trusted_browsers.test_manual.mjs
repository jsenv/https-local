import { requestCertificateForLocalhost } from "@jsenv/https-local"
import {
  // resetAllCertificateFiles,
  startServerForTest,
} from "@jsenv/https-local/tests/test_helpers.mjs"

// await resetAllCertificateFiles()
const { certificate, privateKey } = requestCertificateForLocalhost({
  logLevel: "debug",
  serverCertificateFileUrl: new URL(
    "./certificate/server.crt",
    import.meta.url,
  ),
  rootCertificateOrganizationName: "jsenv",
  rootCertificateOrganizationalUnitName: "https localhost",
})
const serverOrigin = await startServerForTest({
  certificate,
  privateKey,
  keepAlive: true,
  port: 5000,
})
console.log(`Open ${serverOrigin} in a browser`)
