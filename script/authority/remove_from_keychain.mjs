import { createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { removeCertificateFromMacTrustStore } from "@jsenv/https-localhost/src/internal/platforms/mac/mac_trust_store.js"
import { getCertificateAuthorityFileUrls } from "@jsenv/https-localhost/src/internal/certificate_authority_file_urls.js"

const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
await removeCertificateFromMacTrustStore({
  logger: createLogger({ logLevel: "debug" }),
  certificate: await readFile(rootCertificateFileUrl),
  certificateFileUrl: rootCertificateFileUrl,
  certificateCommonName: "Jsenv localhost root certificate",
})
