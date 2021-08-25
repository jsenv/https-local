import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
  requestCertificateForLocalhost,
} from "@jsenv/https-localhost"
import { startServerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

await uninstallCertificateAuthority()
await installCertificateAuthority({
  tryToTrust: true,
})
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost()

const serverOrigin = await startServerForTest({
  port: 4456,
  serverCertificate,
  serverPrivateKey,
  keepAlive: true,
})
console.log(`Open ${serverOrigin} in a browser`)
