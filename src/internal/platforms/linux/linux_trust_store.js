/*
 * see https://github.com/davewasmer/devcert/blob/master/src/platforms/linux.ts
 */

import { existsSync } from "node:fs"
import { createDetailedMessage } from "@jsenv/logger"
import { readFile, urlToFileSystemPath } from "@jsenv/filesystem"

import {
  commandSign,
  okSign,
  infoSign,
  failureSign,
} from "@jsenv/https-localhost/src/internal/logs.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"

const LINUX_CERTIFICATE_AUTHORITIES_DIRECTORY_PATH = `/usr/local/share/ca-certificates/`
const JSENV_CERTIFICATE_AUTHORITY_PATH = `${LINUX_CERTIFICATE_AUTHORITIES_DIRECTORY_PATH}https_localhost_root_certificate.crt`

export const getCertificateTrustInfoFromLinux = async ({ logger, certificate }) => {
  logger.debug(`Searching certificate in linux trust store...`)
  const certificateInStore = existsSync(JSENV_CERTIFICATE_AUTHORITY_PATH)

  if (!certificateInStore) {
    logger.debug(`${infoSign} certificate is not in linux trust store`)
    return {
      status: "not_trusted",
      reason: `not found in linux store`,
    }
  }

  const certificateInLinuxStore = await readFile(JSENV_CERTIFICATE_AUTHORITY_PATH)
  if (certificateInLinuxStore !== certificate) {
    logger.debug(`${infoSign} certificate in linux store is outdated`)
    return {
      status: "not_trusted",
      reason: "outdated version in linux store",
    }
  }

  logger.debug(`${okSign} certificate found in linux trust store`)
  return {
    status: "trusted",
    reason: "found in linux store",
  }
}

export const addCertificateInLinuxTrustStore = async ({ logger, certificateFileUrl }) => {
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  const copyCertificateCommand = `sudo cp "${certificateFilePath}" ${JSENV_CERTIFICATE_AUTHORITY_PATH}`
  const updateCertificateCommand = `sudo update-ca-certificates`
  logger.info(`Adding certificate to linux...`)
  try {
    logger.info(`${commandSign} ${copyCertificateCommand}`)
    await exec(copyCertificateCommand)
    logger.info(`${commandSign} ${updateCertificateCommand}`)
    await exec(updateCertificateCommand)
    logger.info(`${okSign} certificate added to linux`)
    return {
      status: "trusted",
      reason: "command to add certificate completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to add certificate to linux`, {
        "error stack": e.stack,
        "certificate file": certificateFilePath,
      }),
    )
    return {
      status: "not_trusted",
      reason: "command to add certificate failed",
    }
  }
}

export const removeCertificateFromLinuxTrustStore = async ({ logger }) => {
  if (!existsSync(JSENV_CERTIFICATE_AUTHORITY_PATH)) {
    return {
      status: "not_trusted",
      reason: "certificate file not in linux store",
    }
  }

  logger.info(`Removing certificate from linux...`)
  const removeCertificateCommand = `sudo rm ${JSENV_CERTIFICATE_AUTHORITY_PATH}`
  const updateCertificateCommand = `sudo update-ca-certificates`
  try {
    logger.info(`${commandSign} ${removeCertificateCommand}`)
    await exec(removeCertificateCommand)
    logger.info(`${commandSign} ${updateCertificateCommand}`)
    await exec(updateCertificateCommand)
    logger.info(`${okSign} certificate removed from linux`)
    return {
      status: "not_trusted",
      reason: "certificate file removed from linux store",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to delete certificate file in linux store`, {
        "error stack": e.stack,
        "certificate file": JSENV_CERTIFICATE_AUTHORITY_PATH,
      }),
    )
    return {
      status: "unknown",
      reason: "failed to delete certificate file in linux store",
    }
  }
}
