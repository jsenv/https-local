import { createLogger } from "@jsenv/logger"
import { assertAndNormalizeFileUrl, urlToFileSystemPath } from "@jsenv/util"

import { importPlatformMethods } from "./internal/platform.js"

const registerRootCertificateFile = async ({ certificateFileUrl, logLevel }) => {
  const logger = createLogger({ logLevel })
  certificateFileUrl = assertAndNormalizeFileUrl(certificateFileUrl)
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)

  const { addRootCertificateFileToTrustStore } = await importPlatformMethods()
  return addRootCertificateFileToTrustStore({ logger, certificateFilePath })
}

const unregisterRootCertificateFile = async ({ certificateFileUrl, logLevel }) => {
  const logger = createLogger({ logLevel })
  certificateFileUrl = assertAndNormalizeFileUrl(certificateFileUrl)
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)

  const { removeRootCertificateFileFromTrustStore } = await importPlatformMethods()
  return removeRootCertificateFileFromTrustStore({ logger, certificateFilePath })
}

export const platformTrustStore = {
  registerRootCertificateFile,
  unregisterRootCertificateFile,
}
