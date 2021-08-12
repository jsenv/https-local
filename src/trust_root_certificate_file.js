import { createLogger } from "@jsenv/logger"
import { assertAndNormalizeFileUrl, urlToFileSystemPath } from "@jsenv/util"

import { importPlatformMethods } from "./internal/platform.js"

export const addRootCertificateFileToTrustStore = async ({ certificateFileUrl, logLevel }) => {
  const logger = createLogger({ logLevel })
  certificateFileUrl = assertAndNormalizeFileUrl(certificateFileUrl)
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)

  const platformMethods = await importPlatformMethods()
  return platformMethods.addRootCertificateFileToTrustStore({ logger, certificateFilePath })
}

export const removeRootCertificateFileFromTrustStore = async ({ certificateFileUrl, logLevel }) => {
  const logger = createLogger({ logLevel })
  certificateFileUrl = assertAndNormalizeFileUrl(certificateFileUrl)
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)

  const platformMethods = await importPlatformMethods()
  return platformMethods.removeRootCertificateFileFromTrustStore({ logger, certificateFilePath })
}
