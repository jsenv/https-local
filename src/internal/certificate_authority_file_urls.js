import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFilename } from "@jsenv/filesystem"

export const getCertificateAuthorityFileUrls = () => {
  // we need a directory common to every instance of @jsenv/https-local
  // so that even if it's used multiple times, the certificate autority files
  // are reused
  const applicationDirectoryUrl = getJsenvApplicationDirectoryUrl()

  const certificateAuthorityJsonFileUrl = new URL(
    "./https_localhost_certificate_authority.json",
    applicationDirectoryUrl,
  )

  const rootCertificateFileUrl = new URL(
    "./https_localhost_root_certificate.crt",
    applicationDirectoryUrl,
  )

  const rootCertificatePrivateKeyFileUrl = resolveUrl(
    "./https_localhost_root_certificate.key",
    applicationDirectoryUrl,
  )

  return {
    certificateAuthorityJsonFileUrl,
    rootCertificateFileUrl,
    rootCertificatePrivateKeyFileUrl,
  }
}

export const getRootCertificateSymlinkUrls = ({
  rootCertificateFileUrl,
  rootPrivateKeyFileUrl,
  serverCertificateFileUrl,
}) => {
  const serverCertificateDirectory = resolveUrl("./", serverCertificateFileUrl)

  const rootCertificateFilename = urlToFilename(rootCertificateFileUrl)
  const rootCertificateSymlinkUrl = resolveUrl(rootCertificateFilename, serverCertificateDirectory)
  const rootPrivateKeyFilename = urlToFilename(rootPrivateKeyFileUrl)
  const rootPrivateKeySymlinkUrl = resolveUrl(rootPrivateKeyFilename, serverCertificateDirectory)

  return {
    rootCertificateSymlinkUrl,
    rootPrivateKeySymlinkUrl,
  }
}

// https://github.com/LinusU/node-application-config-path/blob/master/index.js
const getJsenvApplicationDirectoryUrl = () => {
  const { platform } = process

  if (platform === "darwin") {
    return resolveUrl(
      `./Library/Application Support/https_localhost/`,
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    )
  }

  if (platform === "linux") {
    if (process.env.XDG_CONFIG_HOME) {
      return resolveUrl(
        `./https_localhost/`,
        assertAndNormalizeDirectoryUrl(process.env.XDG_CONFIG_HOME),
      )
    }
    return resolveUrl(
      `./.config/https_localhost/`,
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    )
  }

  if (platform === "win32") {
    if (process.env.LOCALAPPDATA) {
      return resolveUrl(
        `./https_localhost/`,
        assertAndNormalizeDirectoryUrl(process.env.LOCALAPPDATA),
      )
    }

    return resolveUrl(
      `./Local Settings/Application Data/https_localhost/`,
      assertAndNormalizeDirectoryUrl(process.env.USERPROFILE),
    )
  }

  throw new Error(`platform not supported`)
}
