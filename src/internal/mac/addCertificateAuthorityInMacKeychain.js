import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { commandSign, okSign, failureSign } from "../logs.js"
import { exec } from "../exec.js"

export const addCertificateAuthorityInMacKeychain = async ({ logger, rootCertificateFileUrl }) => {
  const addTrustedCertCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "${urlToFileSystemPath(
    rootCertificateFileUrl,
  )}"`
  logger.info(`Adding certificate authority to mac keychain...`)
  logger.info(`${commandSign} ${addTrustedCertCommand}`)
  try {
    await exec(addTrustedCertCommand)
    logger.info(`${okSign} certificate authority added to keychain`)
    return {
      status: "trusted",
      reason: "add trusted cert command completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to add certificate authority to keychain`, {
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
