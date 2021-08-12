import { createDetailedMessage } from "@jsenv/logger"
// https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts

import { exec } from "../exec.js"

export const addRootCertificateFileToTrustStore = async ({ logger, certificateFilePath }) => {
  logger.debug("adding root certificate to macOS system keychain")

  try {
    const command = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic ${certificateFilePath}`
    logger.debug(`> ${command}`)
    await exec(command)

    return true
  } catch (e) {
    logger.error(
      createDetailedMessage(`failed to add ${certificateFilePath} to macOS system keychain`, {
        "error stack": e.stack,
      }),
    )

    return false
  }
}

export const removeRootCertificateFileFromTrustStore = async ({ logger, certificateFilePath }) => {
  logger.debug("removing root certificate from macOS system keychain")
  const command = `sudo security remove-trusted-cert -d ${certificateFilePath}`
  logger.debug(`> ${command}`)

  try {
    await exec(command)
    return true
  } catch (e) {
    logger.error(
      createDetailedMessage(`failed to remove ${certificateFilePath} from macOS system keychain`, {
        "error stack": e.stack,
      }),
    )
    return false
  }
}
