import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { commandSign, okSign, failureSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"

export const removeCertificateFromMacTrustStore = async ({ logger, certificateFileUrl }) => {
  const removeTrustedCertCommand = `sudo security remove-trusted-cert -d "${urlToFileSystemPath(
    certificateFileUrl,
  )}"`
  logger.info(`Removing certificate from mac keychain...`)
  logger.info(`${commandSign} ${removeTrustedCertCommand}`)
  try {
    await exec(removeTrustedCertCommand)
    logger.info(`${okSign} certificate removed from keychain`)
    return {
      status: "not_trusted",
      reason: "remove trusted cert command completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to remove certificate from keychain`, {
        "error stack": e.stack,
        "certificate file url": certificateFileUrl,
      }),
    )
    return {
      status: "unknown", // maybe it was not trusted?
      reason: "remove trusted cert command failed",
    }
  }
}
