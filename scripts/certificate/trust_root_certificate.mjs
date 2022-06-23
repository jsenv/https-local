import { createLogger } from "@jsenv/log"
import { readFile } from "@jsenv/filesystem"

import { jsenvParameters } from "@jsenv/https-local/src/jsenvParameters.js"
import { importPlatformMethods } from "@jsenv/https-local/src/internal/platform.js"
import { getCertificateAuthorityFileUrls } from "@jsenv/https-local/src/internal/certificate_authority_file_urls.js"

const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
const { executeTrustQuery } = await importPlatformMethods()
await executeTrustQuery({
  logger: createLogger({ logLevel: "debug" }),
  certificateCommonName: jsenvParameters.certificateCommonName,
  certificateFileUrl: rootCertificateFileUrl,
  certificate: await readFile(rootCertificateFileUrl, { as: "string" }),
  verb: "ADD_TRUST",
  NSSDynamicInstall: true,
})
