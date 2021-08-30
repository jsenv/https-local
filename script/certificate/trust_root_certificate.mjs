import { createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { jsenvParameters } from "@jsenv/local-https-certificates/src/jsenvParameters.js"
import { importPlatformMethods } from "@jsenv/local-https-certificates/src/internal/platform.js"
import { getCertificateAuthorityFileUrls } from "@jsenv/local-https-certificates/src/internal/certificate_authority_file_urls.js"

const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
const { addCertificateToTrustStores } = await importPlatformMethods()
await addCertificateToTrustStores({
  logger: createLogger({ logLevel: "debug" }),
  certificate: await readFile(rootCertificateFileUrl),
  certificateFileUrl: rootCertificateFileUrl,
  certificateCommonName: jsenvParameters.certificateCommonName,
})
