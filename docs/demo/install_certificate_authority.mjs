import { installCertificateAuthority } from "@jsenv/https-localhost"

await installCertificateAuthority({
  tryToTrust: true,
})
