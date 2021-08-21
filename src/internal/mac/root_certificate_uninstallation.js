import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { exec } from "../exec.js"
import { removeRootCertificateFromNSSDBFiles } from "../nss_db_files.js"
import { detectFirefox, firefoxNSSDBDirectoryUrl } from "./mac_firefox.js"
import { detectCertutil, getCertutilBinPath } from "./mac_utils.js"

export const uninstallRootCertificate = async ({
  logger,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
}) => {
  await uninstallRootCertificateFromMac({ logger, rootCertificate, rootCertificateFileUrl })
  await uninstallRootCertificateFromFirefox({ rootCertificate, rootCertificateCommonName })
  // no need for chrome and safari, they are handled by mac keychain
}

const uninstallRootCertificateFromMac = async ({ logger, rootCertificateFileUrl }) => {
  const removeTrustedCertCommand = `sudo security remove-trusted-cert -d "${urlToFileSystemPath(
    rootCertificateFileUrl,
  )}"`

  logger.info(`Removing root certificate to macOS keychain`)
  try {
    logger.info(`> ${removeTrustedCertCommand}`)
    await exec(removeTrustedCertCommand)
  } catch (e) {
    logger.error(
      createDetailedMessage(`Failed to remove root certificate from macOS keychain`, {
        "error stack": e.stack,
        "root certificate file url": rootCertificateFileUrl,
      }),
    )
  }
  logger.info(`Root certificate removed from macOS keychain`)
}

const uninstallRootCertificateFromFirefox = async ({
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
    return false
  }

  logger.info(`Removing root certificate from firefox NSSDB files`)
  const result = await removeRootCertificateFromNSSDBFiles({
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
    rootCertificateCommonName,
    rootCertificate,
    getCertutilBinPath,
  })
  logger.info(`Root certificate removed from firefox NSSDB files`)
  return result
}
