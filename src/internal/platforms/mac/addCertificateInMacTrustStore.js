import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { commandSign, okSign, failureSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"

export const addCertificateInMacTrustStore = async ({ logger, certificateFileUrl }) => {
  const addTrustedCertCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "${urlToFileSystemPath(
    certificateFileUrl,
  )}"`
  logger.info(`Adding certificate to mac keychain...`)
  logger.info(`${commandSign} ${addTrustedCertCommand}`)
  try {
    await exec(addTrustedCertCommand)
    logger.info(`${okSign} certificate added to mac keychain`)
    return {
      status: "trusted",
      reason: "add trusted cert command completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to add certificate to mac keychain`, {
        "error stack": e.stack,
        "root certificate file url": certificateFileUrl,
      }),
    )
    return {
      status: "not_trusted",
      reason: "add trusted cert command failed",
    }
  }
}
