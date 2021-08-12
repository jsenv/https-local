// https://github.com/davewasmer/devcert/blob/master/src/platforms/linux.ts

import { createDetailedMessage } from "@jsenv/logger"

import { exec } from "../exec.js"

export const addRootCertificateFileToTrustStore = async ({ logger, certificateFilePath }) => {
  logger.debug("adding root certificate to Linux trust stores")

  try {
    const copyCertificateCommand = `sudo cp ${certificateFilePath} /usr/local/share/ca-certificates/devcert.crt`
    logger.debug(`> ${copyCertificateCommand}`)
    await exec(copyCertificateCommand)

    const updateCertificateCommand = `sudo update-ca-certificates`
    logger.debug(`> ${updateCertificateCommand}`)
    await exec(updateCertificateCommand)

    return true
  } catch (e) {
    logger.error(
      createDetailedMessage(`failed to add ${certificateFilePath} to Linux trust stores`, {
        "error stack": e.stack,
      }),
    )

    return false
  }
}

export const removeRootCertificateFileFromTrustStore = async ({ logger, certificateFilePath }) => {
  logger.debug("removing root certificate from Linux trust stores")

  try {
    const removeCertificateCommand = `sudo rm /usr/local/share/ca-certificates/devcert.crt`
    logger.debug(`> ${removeCertificateCommand}`)
    await exec(removeCertificateCommand)

    const updateCertificateCommand = `sudo update-ca-certificates`
    logger.debug(`> ${updateCertificateCommand}`)
    await exec(updateCertificateCommand)

    return true
  } catch (e) {
    logger.error(
      createDetailedMessage(`failed to remove ${certificateFilePath} from linux trust stores`, {
        "error stack": e.stack,
      }),
    )

    return false
  }
}
