import { writeSymbolicLink } from "@jsenv/filesystem"
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
const { serverCertificate, serverCertificatePrivateKey, rootCertificateFilePath } =
  await requestCertificateForLocalhost({
    serverCertificateAltNames: ["localhost", "*.localhost"],
  })

if (process.platform !== "win32") {
  // not on windows because symlink requires admin rights
  await writeSymbolicLink({
    from: new URL("./jsenv_root_cert.pem", import.meta.url),
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
