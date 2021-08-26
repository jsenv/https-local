import { createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { getCertificateTrustInfoFromFirefox } from "@jsenv/https-localhost/src/internal/platforms/mac/firefox_trust_store.js"
import { getCertificateAuthorityFileUrls } from "@jsenv/https-localhost/src/internal/certificate_authority_file_urls.js"

const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
const firefoxTrustInfo = await getCertificateTrustInfoFromFirefox({
  logger: createLogger({ logLevel: "debug" }),
  certificate: await readFile(rootCertificateFileUrl),
  certificateFileUrl: rootCertificateFileUrl,
  certificateCommonName: "Jsenv localhost root certificate",
})
console.log(firefoxTrustInfo)
