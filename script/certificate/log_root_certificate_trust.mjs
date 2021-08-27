import { createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { jsenvParameters } from "@jsenv/https-localhost/src/jsenvParameters.js"
import { importPlatformMethods } from "@jsenv/https-localhost/src/internal/platform.js"
import { getCertificateAuthorityFileUrls } from "@jsenv/https-localhost/src/internal/certificate_authority_file_urls.js"

const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
const { getCertificateTrustInfo } = await importPlatformMethods()
const trustInfo = await getCertificateTrustInfo({
  logger: createLogger({ logLevel: "debug" }),
  certificate: await readFile(rootCertificateFileUrl),
  certificateFileUrl: rootCertificateFileUrl,
  certificateCommonName: jsenvParameters.certificateCommonName,
})
console.log(trustInfo)
