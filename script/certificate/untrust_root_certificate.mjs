import { createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { jsenvParameters } from "@jsenv/local-https-certificates/src/jsenvParameters.js"
import { importPlatformMethods } from "@jsenv/local-https-certificates/src/internal/platform.js"
import { getCertificateAuthorityFileUrls } from "@jsenv/local-https-certificates/src/internal/certificate_authority_file_urls.js"

const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
const { executeTrustQuery } = await importPlatformMethods()
await executeTrustQuery({
  logger: createLogger({ logLevel: "debug" }),
  certificateCommonName: jsenvParameters.certificateCommonName,
  certificateFileUrl: rootCertificateFileUrl,
  certificate: await readFile(rootCertificateFileUrl),
  verb: "REMOVE_TRUST",
})
