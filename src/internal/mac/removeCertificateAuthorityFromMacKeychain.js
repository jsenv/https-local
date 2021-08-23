import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { commandSign, okSign, failureSign } from "../logs.js"
import { exec } from "../exec.js"

export const removeCertificateAuthorityFromMacKeychain = async ({
  logger,
  rootCertificateFileUrl,
}) => {
  const removeTrustedCertCommand = `sudo security remove-trusted-cert -d "${urlToFileSystemPath(
    rootCertificateFileUrl,
  )}"`
  logger.info(`Removing certificate authority from mac keychain...`)
  logger.info(`${commandSign} ${removeTrustedCertCommand}`)
  try {
    await exec(removeTrustedCertCommand)
    logger.info(`${okSign} certificate authority removed from keychain`)
    return {
      status: "not_trusted",
      reason: "remove trusted cert command completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to remove certificate authority from keychain`, {
        "error stack": e.stack,
        "root certificate file url": rootCertificateFileUrl,
      }),
    )
    return {
      status: "unknown", // maybe it was not trusted?
      reason: "remove trusted cert command failed",
    }
  }
}
