/*
 * see https://github.com/davewasmer/devcert/blob/master/src/platforms/win32.ts
 * https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil
 */

import { createDetailedMessage } from "@jsenv/logger"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import {
  commandSign,
  okSign,
  infoSign,
  failureSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"

const REASON_NOT_FOUND = "not found in windows store"
const REASON_FOUND = "found in windows store"
const REASON_ADD_COMMAND_FAILED = "command to add certificate to windows store failed"
const REASON_ADD_COMMAND_COMPLETED = "command to add certificate to windows store completed"
const REASON_DELETE_COMMAND_FAILED = "command to remove certificate from windows store failed"
const REASON_DELETE_COMMAND_COMPLETED = "command to remove certificate from windows store completed"

const getCertificateTrustInfoFromWindows = async ({
  logger,
  newAndTryToTrustDisabled,
  certificateCommonName,
}) => {
  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to windows`)
    return {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    }
  }

  logger.info(`Check if certificate is trusted by windows...`)
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil#-viewstore
  // TODO: check if -viewstore works better than -store
  const certutilListCommand = `certutil -store -user root`
  logger.debug(`Searching certificate in windows trust store...`)
  logger.debug(`${commandSign} ${certutilListCommand}`)
  const certutilListCommandOutput = await exec(certutilListCommand)

  // it's not super accurate and do not take into account if the cert is different
  // but it's the best I could do with certutil command on windows
  const certificateInStore = certutilListCommandOutput.includes(certificateCommonName)
  if (!certificateInStore) {
    logger.debug(`${infoSign} certificate is not in windows trust store`)
    logger.info(`${infoSign} certificate not trusted by windows`)
    return {
      status: "not_trusted",
      reason: REASON_NOT_FOUND,
    }
  }

  logger.debug(`${okSign} certificate found in windows trust store`)
  logger.info(`${okSign} certificate trusted by windows`)
  return {
    status: "trusted",
    reason: REASON_FOUND,
  }
}
// getCertificateTrustInfoFromWindows({
//   logger: {
//     debug: () => {},
//     info: () => {},
//   },
// })

const addCertificateInWindowsTrustStore = async ({
  logger,
  certificateFileUrl,
  existingTrustInfo,
}) => {
  if (existingTrustInfo && existingTrustInfo.windows.status === "trusted") {
    return existingTrustInfo.windows
  }

  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil#-addstore
  const certutilAddCommand = `certutil -addstore -user root ${certificateFilePath}`
  logger.info(`Adding certificate to windows...`)
  logger.info(`${commandSign} ${certutilAddCommand}`)
  try {
    await exec(certutilAddCommand)
    logger.info(`${okSign} certificate added to windows`)
    return {
      status: "trusted",
      reason: REASON_ADD_COMMAND_COMPLETED,
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to add certificate to windows`, {
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

const removeCertificateFromWindowsTrustStore = async ({
  logger,
  certificateCommonName,
  certificateFileUrl,
}) => {
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil#-delstore
  const certutilRemoveCommand = `certutil -delstore -user root "${certificateCommonName}"`
  logger.info(`Removing certificate from windows...`)
  logger.info(`${commandSign} ${certutilRemoveCommand}`)
  try {
    await exec(certutilRemoveCommand)
    logger.info(`${okSign} certificate removed from windows`)
    return {
      status: "not_trusted",
      reason: REASON_DELETE_COMMAND_COMPLETED,
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to remove certificate from windows`, {
        "error stack": e.stack,
        "certificate file": certificateFilePath,
      }),
    )
    return {
      status: "unknown", // maybe it was not trusted?
      reason: REASON_DELETE_COMMAND_FAILED,
    }
  }
}

export const windowsTrustStore = {
  getCertificateTrustInfo: getCertificateTrustInfoFromWindows,
  addCertificate: addCertificateInWindowsTrustStore,
  removeCertificate: removeCertificateFromWindowsTrustStore,
}
