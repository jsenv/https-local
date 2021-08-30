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
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"

const REASON_NEW_AND_TRY_TO_TRUST_DISABLED = "certificate is new and tryToTrust is disabled"
const REASON_NOT_FOUND_IN_LINUX = `not found in linux store`
const REASON_OUTDATED_IN_LINUX = "certificate in linux store is outdated"
const REASON_FOUND_IN_LINUX = "found in linux store"
const REASON_ADD_COMMAND_FAILED = "command to add certificate to linux failed"
const REASON_ADD_COMMAND_COMPLETED = "command to add certificate to linux completed"
const REASON_REMOVE_COMMAND_FAILED = "command to remove certificate from linux failed"
const REASON_REMOVE_COMMAND_COMPLETED = "command to remove certificate from linux completed"

const LINUX_CERTIFICATE_AUTHORITIES_DIRECTORY_PATH = `/usr/local/share/ca-certificates/`
const JSENV_CERTIFICATE_AUTHORITY_PATH = `${LINUX_CERTIFICATE_AUTHORITIES_DIRECTORY_PATH}https_localhost_root_certificate.crt`

const getCertificateTrustInfoFromLinux = async ({
  logger,
  certificate,
  newAndTryToTrustDisabled,
}) => {
  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to linux`)
    return {
      status: "not_trusted",
      reason: REASON_NEW_AND_TRY_TO_TRUST_DISABLED,
    }
  }

  logger.info(`Check if certificate is trusted by linux...`)
  logger.debug(`Searching certificate file at ${JSENV_CERTIFICATE_AUTHORITY_PATH}...`)
  const certificateInStore = existsSync(JSENV_CERTIFICATE_AUTHORITY_PATH)

  if (!certificateInStore) {
    logger.debug(`${infoSign} not certificate file found`)
    logger.info(`${infoSign} certificate not trusted by linux`)
    return {
      status: "not_trusted",
      reason: REASON_NOT_FOUND_IN_LINUX,
    }
  }

  const certificateInLinuxStore = await readFile(JSENV_CERTIFICATE_AUTHORITY_PATH)
  if (certificateInLinuxStore !== certificate) {
    logger.debug(`${infoSign} certificate in linux store is outdated`)
    logger.info(`${infoSign} certificate not trusted by linux`)
    return {
      status: "not_trusted",
      reason: REASON_OUTDATED_IN_LINUX,
    }
  }

  logger.debug(`${okSign} certificate found in linux trust store`)
  logger.info(`${okSign} certificate trusted by linux`)
  return {
    status: "trusted",
    reason: REASON_FOUND_IN_LINUX,
  }
}

const addCertificateInLinuxTrustStore = async ({
  logger,
  certificateFileUrl,
  existingTrustInfo,
}) => {
  if (existingTrustInfo && existingTrustInfo.linux.status === "trusted") {
    return existingTrustInfo.linux
  }

  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  const copyCertificateCommand = `sudo /bin/cp -f "${certificateFilePath}" ${JSENV_CERTIFICATE_AUTHORITY_PATH}`
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
      reason: REASON_ADD_COMMAND_COMPLETED,
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
      reason: REASON_ADD_COMMAND_FAILED,
    }
  }
}

const removeCertificateFromLinuxTrustStore = async ({ logger }) => {
  if (!existsSync(JSENV_CERTIFICATE_AUTHORITY_PATH)) {
    return {
      status: "not_trusted",
      reason: REASON_NOT_FOUND_IN_LINUX,
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
      reason: REASON_REMOVE_COMMAND_COMPLETED,
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
      reason: REASON_REMOVE_COMMAND_FAILED,
    }
  }
}

export const linuxTrustStore = {
  getCertificateTrustInfo: getCertificateTrustInfoFromLinux,
  addCertificate: addCertificateInLinuxTrustStore,
  removeCertificate: removeCertificateFromLinuxTrustStore,
}
