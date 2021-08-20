import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFilename } from "@jsenv/filesystem"

export const getCertificateAuthorityFileUrls = () => {
  // we need a directory common to every instance of @jsenv/https-localhost
  // so that even if it's used multiple times, the certificate autority files
  // are reused
  const applicationDirectoryUrl = getJsenvApplicationDirectoryUrl()

  const certificateAuthorityJsonFileUrl = new URL(
    "./jsenv_certificate_authority.json",
    applicationDirectoryUrl,
  )

  const rootCertificateFileUrl = new URL("./jsenv_root_certificate.crt", applicationDirectoryUrl)

  const rootPrivateKeyFileUrl = resolveUrl("./jsenv_root_certificate.key", applicationDirectoryUrl)

  return {
    certificateAuthorityJsonFileUrl,
    rootCertificateFileUrl,
    rootPrivateKeyFileUrl,
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
      `./Library/Application Support/jsenv_https_localhost/`,
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    )
  }

  if (platform === "linux") {
    if (process.env.XDG_CONFIG_HOME) {
      return resolveUrl(
        `./jsenv_https_localhost/`,
        assertAndNormalizeDirectoryUrl(process.env.XDG_CONFIG_HOME),
      )
    }
    return resolveUrl(
      `./.config/jsenv_https_localhost/`,
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    )
  }

  if (platform === "win32") {
    if (process.env.LOCALAPPDATA) {
      return resolveUrl(
        `./jsenv_https_localhost/`,
        assertAndNormalizeDirectoryUrl(process.env.LOCALAPPDATA),
      )
    }

    return resolveUrl(
      `./Local Settings/Application Data/jsenv_https_localhost/`,
      assertAndNormalizeDirectoryUrl(process.env.USERPROFILE),
    )
  }

  throw new Error(`platform not supported`)
}
