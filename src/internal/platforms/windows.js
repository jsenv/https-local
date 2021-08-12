/*
 * see https://github.com/davewasmer/devcert/blob/master/src/platforms/win32.ts
 */

import { createDetailedMessage } from "@jsenv/logger"

import { exec } from "../exec.js"

export const addRootCertificateFileToTrustStore = async ({ logger, certificateFilePath }) => {
  logger.debug("adding root certificate to Windows OS trust store")

  try {
    const command = `certutil -addstore -user root ${certificateFilePath}`
    logger.debug(`> ${command}`)
    await exec(command)

    return true
  } catch (e) {
    logger.error(
      createDetailedMessage(`failed to add ${certificateFilePath} Windows OS trust store`, {
        "error stack": e.stack,
      }),
    )
    return false
  }
}

export const removeRootCertificateFileFromTrustStore = async ({ logger, certificateFilePath }) => {
  logger.debug("removing root certificate from windows OS trust store")

  try {
    logger.warn(
      `Removing old certificates from trust stores. You may be prompted to grant permission for this. It's safe to delete old devcert certificates.`,
    )
    const command = `certutil -delstore -user -root devcert` // TODO: why devcert and not the file path?
    logger.debug(`> ${command}`)
    await exec(command)

    return true
  } catch (e) {
    logger.error(
      createDetailedMessage(`failed to remove ${certificateFilePath} from windows OS trust store`, {
        "error stack": e.stack,
      }),
    )

    return false
  }
}
