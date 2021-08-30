import { installCertificateAuthority } from "@jsenv/local-https-certificates"

await installCertificateAuthority({
  tryToTrust: true,
})
