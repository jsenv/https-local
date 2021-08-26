import { existsSync } from "node:fs"

import { urlToFileSystemPath } from "@jsenv/filesystem"

import { getCertificateAuthorityFileUrls } from "./certificate_authority_file_urls.js"

export const getAuthorityFileInfos = () => {
  const {
    certificateAuthorityJsonFileUrl,
    rootCertificateFileUrl,
    rootCertificatePrivateKeyFileUrl,
  } = getCertificateAuthorityFileUrls()

  const authorityJsonFilePath = urlToFileSystemPath(certificateAuthorityJsonFileUrl)
  const authorityJsonFileDetected = existsSync(authorityJsonFilePath)

  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)
  const rootCertificateFileDetected = existsSync(rootCertificateFilePath)

  const rootCertificatePrivateKeyFilePath = urlToFileSystemPath(rootCertificatePrivateKeyFileUrl)
  const rootCertificatePrivateKeyFileDetected = existsSync(rootCertificatePrivateKeyFilePath)

  return {
    authorityJsonFileInfo: {
      url: certificateAuthorityJsonFileUrl,
      path: authorityJsonFilePath,
      exists: authorityJsonFileDetected,
    },
    rootCertificateFileInfo: {
      url: rootCertificateFileUrl,
      path: rootCertificateFilePath,
      exists: rootCertificateFileDetected,
    },
    rootPrivateKeyFileInfo: {
      url: rootCertificatePrivateKeyFileUrl,
      path: rootCertificatePrivateKeyFilePath,
      exists: rootCertificatePrivateKeyFileDetected,
    },
  }
}
