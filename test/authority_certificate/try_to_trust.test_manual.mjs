import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
  requestCertificateForLocalhost,
} from "@jsenv/https-localhost"
import { startServerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

await uninstallCertificateAuthority({
  tryToUntrust: true,
})
await installCertificateAuthority({
  tryToTrust: true,
})
const { serverCertificate, serverCertificatePrivateKey } = await requestCertificateForLocalhost({
  serverCertificateAltNames: ["localhost"],
})

const serverOrigin = await startServerForTest({
  port: 4456,
  serverCertificate,
  serverCertificatePrivateKey,
  keepAlive: true,
})
console.log(`Open ${serverOrigin} in a browser`)
