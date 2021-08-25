import { existsSync } from "node:fs"

import { urlToFileSystemPath } from "@jsenv/filesystem"

import { getCertificateAuthorityFileUrls } from "./certificate_authority_file_urls.js"

export const getAuthorityFileInfos = () => {
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  const authorityJsonFilePath = urlToFileSystemPath(certificateAuthorityJsonFileUrl)
  const authorityJsonFileDetected = existsSync(authorityJsonFilePath)

  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)
  const rootCertificateFileDetected = existsSync(rootCertificateFilePath)

  const rootPrivateKeyFilePath = urlToFileSystemPath(rootPrivateKeyFileUrl)
  const rootPrivateKeyFileDetected = existsSync(rootPrivateKeyFilePath)

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
      url: rootPrivateKeyFileUrl,
      path: rootPrivateKeyFilePath,
      exists: rootPrivateKeyFileDetected,
    },
  }
}
