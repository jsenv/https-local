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
} from "@jsenv/https-localhost/src/internal/logs.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"

export const getCertificateTrustInfoFromWindows = async ({ logger, certificateCommonName }) => {
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
    return {
      status: "not_trusted",
      reason: `not found in windows`,
    }
  }

  logger.debug(`${okSign} certificate found in windows trust store`)
  return {
    status: "trusted",
    reason: "found in windows",
  }
}

export const addCertificateInWindowsTrustStore = async ({ logger, certificateFileUrl }) => {
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil#-addstore
  const certutilAddCommand = `certutil -addstore -user root "${certificateFilePath}"`
  logger.info(`Adding certificate to windows...`)
  logger.info(`${commandSign} ${certutilAddCommand}`)
  try {
    await exec(certutilAddCommand)
    logger.info(`${okSign} certificate added to windows`)
    return {
      status: "trusted",
      reason: "command to add certificate completed",
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
      reason: "command to add certificate failed",
    }
  }
}

export const removeCertificateFromWindowsTrustStore = async ({ logger, certificateFileUrl }) => {
  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil#-delstore
  const certutilRemoveCommand = `certutil -delstore -user root "${certificateFilePath}"`
  logger.info(`Removing certificate from windows...`)
  logger.info(`${commandSign} ${certutilRemoveCommand}`)
  try {
    await exec(certutilRemoveCommand)
    logger.info(`${okSign} certificate removed from windows`)
    return {
      status: "not_trusted",
      reason: "command to delete certificate completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to remove certificate from windows`, {
        "error stack": e.stack,
        "certificate file url": certificateFileUrl,
      }),
    )
    return {
      status: "unknown", // maybe it was not trusted?
      reason: "command to delete certificate failed",
    }
  }
}
