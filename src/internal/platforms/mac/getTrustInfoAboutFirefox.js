import { createDetailedMessage } from "@jsenv/logger"

import { executeOnEveryNSSDB } from "@jsenv/https-localhost/src/internal/nssdb.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"
import {
  okSign,
  infoSign,
  commandSign,
  failureSign,
  warningSign,
} from "@jsenv/https-localhost/src/internal/logs.js"
import { detectNSSCommand, firefoxNSSDBDirectoryUrl, getCertutilBinPath } from "./mac_utils.js"

const REASON_MISSING_NSS = `"nss" is not installed`
const REASON_FIREFOX_NSSDB_NOT_FOUND = "could not find Firefox nss database file"
const REASON_NSSDB_LIST_COMMAND_FAILURE = `error while listing nssdb certificates`
const REASON_MISSING_IN_SOME_FIREFOX_NSSDB = `missing in some firefox nss database file`
const REASON_FOUND_IN_ALL_FIREFOX_NSSDB = `found in all firefox nss database file`

export const getTrustInfoAboutFirefox = async ({
  logger,
  rootCertificate,
  rootCertificateCommonName,
} = {}) => {
  const nssAvailable = await detectNSSCommand({ logger })
  if (!nssAvailable) {
    return {
      status: "unknown",
      reason: REASON_MISSING_NSS,
    }
  }

  const founds = []
  const missings = []
  return executeOnEveryNSSDB({
    logger,
    NSSDBBrowserName: "Firefox",
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
    callback: async ({ directoryArg, NSSDBFileUrl }) => {
      const certutilBinPath = await getCertutilBinPath()
      const certutilListCommand = `${certutilBinPath} -L -a -d ${directoryArg} -n "${rootCertificateCommonName}"`
      logger.debug(`Checking if certificate authority is in nss database file...`)
      logger.debug(`${commandSign} ${certutilListCommand}`)

      try {
        const certutilCommandOutput = await exec(certutilListCommand)
        const isInDatabase = rootCertificate === certutilCommandOutput
        if (isInDatabase) {
          logger.debug(`${okSign} certificate authority found in nssdb`)
          founds.push(NSSDBFileUrl)
        } else {
          logger.debug(`${infoSign} certificate authority in nssdb is outdated`)
          missings.push(NSSDBFileUrl)
        }
      } catch (error) {
        if (error.message.includes("PR_FILE_NOT_FOUND_ERROR")) {
          logger.debug(`${infoSign} certificate authority not found in nssdb`)
          missings.push(NSSDBFileUrl)
          return
        }
        logger.error(
          createDetailedMessage(`${failureSign} ${REASON_NSSDB_LIST_COMMAND_FAILURE}`, {
            "error stack": error.stack,
          }),
        )
        throw error
      }
    },
    onError: () => {
      return {
        status: "unknown",
        reason: REASON_NSSDB_LIST_COMMAND_FAILURE,
      }
    },
    onComplete: ({ fileCount }) => {
      if (fileCount === 0) {
        return {
          status: "unknown",
          reason: REASON_FIREFOX_NSSDB_NOT_FOUND,
        }
      }

      const missingCount = missings.length
      if (missingCount > 0) {
        logger.warn(
          `${warningSign} certificate missing in ${missingCount} firefox nss database file`,
        )
        return {
          status: "not_trusted",
          reason: REASON_MISSING_IN_SOME_FIREFOX_NSSDB,
        }
      }

      logger.debug(`${okSign} certificate found in ${fileCount} firefox nss database file`)
      return {
        status: "trusted",
        reason: REASON_FOUND_IN_ALL_FIREFOX_NSSDB,
      }
    },
  })
}

// getTrustInfoAboutFirefox({
//   rootCertificateCommonName: "Jsenv localhost root certificate2",
// })
