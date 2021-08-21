import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { exec } from "../exec.js"
import { commandExists } from "../command.js"
import { removeRootCertificateFromNSSDBFiles } from "../nss_db_files.js"
import { detectFirefox, firefoxNSSDBDirectoryUrl } from "./mac_firefox.js"
import { detectCertutil, getCertutilBinPath } from "./mac_utils.js"

export const installRootCertificate = async ({
  logger,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
  mac,
  firefox,
}) => {
  const trustInfo = {}

  if (mac) {
    const macTrustInfo = await installRootCertificateInMac({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
    })
    trustInfo.mac = macTrustInfo
    // chrome use OS trust store
    trustInfo.chrome = { ...macTrustInfo }
    // safari use OS trust store
    trustInfo.safari = { ...macTrustInfo }
  }
  if (firefox) {
    trustInfo.firefox = await installRootCertificateInFirefox({
      rootCertificate,
      rootCertificateCommonName,
    })
  }

  return trustInfo
}

const installRootCertificateInMac = async ({ logger, rootCertificateFileUrl }) => {
  const addTrustedCertCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "${urlToFileSystemPath(
    rootCertificateFileUrl,
  )}"`

  logger.info(`Adding root certificate to macOS keychain`)
  logger.info(`> ${addTrustedCertCommand}`)
  try {
    await exec(addTrustedCertCommand)
    logger.info(`Root certificate added to macOS keychain`)
    return {
      status: "trusted",
      reason: "add trusted command ok",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`Failed to add root certificate to macOS keychain`, {
        "error stack": e.stack,
        "root certificate file url": rootCertificateFileUrl,
      }),
    )
    return {
      status: "not_trusted",
      reason: "add trusted cert command failed",
    }
  }
}

const installRootCertificateInFirefox = async ({
  logger,
  rootCertificate,
  rootCertificateCommonName,
}) => {
  const firefoxDetected = detectFirefox()
  if (!firefoxDetected) {
    return false
  }

  const certutilAvailable = await detectCertutil()
  if (!certutilAvailable) {
    if (!commandExists("brew")) {
      logger.debug(
        `Cannot install root certificate on firefox because certutil and home brew are not installed`,
      )
      return false
    }

    const brewInstallCommand = `brew install nss`
    logger.info(`certutil is not installed, trying to install certutil via Homebrew`)
    logger.info(`> ${brewInstallCommand}`)
    try {
      await exec(brewInstallCommand)
    } catch (e) {
      logger.error(createDetailedMessage(`brew install nss error`, { "error stack": e.stack }))
      return false
    }
  }

  logger.info(`Adding root certificate to firefox NSSDB files`)
  const result = await removeRootCertificateFromNSSDBFiles({
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
    rootCertificateCommonName,
    rootCertificate,
    getCertutilBinPath,
  })
  logger.info(`Root certificate added to firefox NSSDB files`)
  return result
}
