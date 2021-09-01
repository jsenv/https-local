import { uninstallCertificateAuthority } from "@jsenv/local-https-certificates"

await uninstallCertificateAuthority({
  logLevel: "debug",
})
