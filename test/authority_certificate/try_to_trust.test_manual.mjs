// https://github.com/nccgroup/wssip/blob/56d0d2c15a7c0fd4c99be445ec8d6c16571e81a0/lib/mitmengine.js#L450

import { writeSymbolicLink } from "@jsenv/filesystem"
import {
  installCertificateAuthority,
  uninstallCertificateAuthority,
  requestCertificateForLocalhost,
} from "@jsenv/local-https-certificates"
import { startServerForTest } from "@jsenv/local-https-certificates/test/test_helpers.mjs"

await uninstallCertificateAuthority({
  tryToUntrust: true,
})
await installCertificateAuthority({
  tryToTrust: true,
})
const { serverCertificate, serverCertificatePrivateKey, rootCertificateFilePath } =
  await requestCertificateForLocalhost({
    serverCertificateAltNames: ["localhost", "*.localhost"],
  })

if (process.platform !== "win32") {
  // not on windows because symlink requires admin rights
  await writeSymbolicLink({
    from: new URL("./jsenv_root_certificate.pem", import.meta.url),
    to: rootCertificateFilePath,
    type: "file",
    allowUseless: true,
    allowOverwrite: true,
  })
}

const serverOrigin = await startServerForTest({
  port: 4456,
  serverCertificate,
  serverCertificatePrivateKey,
  keepAlive: true,
})
console.log(`Open ${serverOrigin} in a browser`)
