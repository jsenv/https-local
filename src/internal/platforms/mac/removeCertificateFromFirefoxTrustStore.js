import { createDetailedMessage } from "@jsenv/logger"

import { executeOnEveryNSSDB } from "@jsenv/https-localhost/src/internal/nssdb.js"
import { okSign, failureSign, commandSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"

import {
  detectNSSCommand,
  getCertutilBinPath,
  detectFirefox,
  firefoxNSSDBDirectoryUrl,
} from "./mac_utils.js"

const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_MISSING_NSS = `"nss" is not installed`
const REASON_FIREFOX_NSSDB_NOT_FOUND = "could not find Firefox nss database file"
const REASON_NSSDB_REMOVE_COMMAND_FAILURE = `nss remove command failure`
const REASON_REMOVED_FROM_ALL_FIREFOX_NSSDB = `removed from all firefox nss database file`

export const removeCertificateFromFirefoxTrustStore = async ({
  logger,
  certificate,
  certificateCommonName,
}) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  const nssCommandAvailable = await detectNSSCommand({ logger })
  if (!nssCommandAvailable) {
    logger.debug(`No certificate to remove because "nss" is not installed`)
    return {
      status: "unknown",
      reason: REASON_MISSING_NSS,
    }
  }

  logger.info(`Removing certificate from Firefox...`)
  const failureMessage = `${failureSign} failed to remove certificate from Firefox`
  return executeOnEveryNSSDB({
    logger,
    NSSDBBrowserName: "Firefox",
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
    callback: async ({ directoryArg, NSSDBFileUrl }) => {
      const certutilBinPath = await getCertutilBinPath()
      const certutilRemoveCommand = `${certutilBinPath} -D -d ${directoryArg} -t C,, -i "${certificate}" -n "${certificateCommonName}"`
      logger.debug(`Removing certificate from ${NSSDBFileUrl}...`)
      logger.debug(`${commandSign} ${certutilRemoveCommand}`)
      try {
        await exec(certutilRemoveCommand)
        logger.debug(`${okSign} certificate removed`)
      } catch (error) {
        logger.error(
          createDetailedMessage(failureMessage, {
            "reason": REASON_NSSDB_REMOVE_COMMAND_FAILURE,
            "error stack": error.stack,
          }),
        )
        throw error
      }
    },
    onError: () => {
      return {
        status: "not_trusted",
        reason: REASON_NSSDB_REMOVE_COMMAND_FAILURE,
      }
    },
    onComplete: ({ fileCount }) => {
      if (fileCount === 0) {
        logger.warn(
          createDetailedMessage(failureMessage, {
            reason: REASON_FIREFOX_NSSDB_NOT_FOUND,
          }),
        )
        return {
          status: "unknown",
          reason: REASON_FIREFOX_NSSDB_NOT_FOUND,
        }
      }

      logger.debug(`${okSign} certificate removed from ${fileCount} firefox nss database file`)
      logger.info(`${okSign} certificate removed from Firefox`)
      return {
        status: "not_trusted",
        reason: REASON_REMOVED_FROM_ALL_FIREFOX_NSSDB,
      }
    },
  })
}
