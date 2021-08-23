import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { executeOnEveryNSSDB } from "../nssdb.js"
import { okSign, failureSign, commandSign } from "../logs.js"
import { commandExists } from "../command.js"
import { exec } from "../exec.js"
import {
  detectNSSCommand,
  detectFirefox,
  getCertutilBinPath,
  firefoxNSSDBDirectoryUrl,
} from "./mac_utils.js"

const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_MISSING_NSS_AND_BREW = `"nss" and "brew" are not installed`
const REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED = `"nss" is not installed and NSSDynamicInstall is false`
const REASON_FIREFOX_NSSDB_NOT_FOUND = "could not find Firefox nss database file"
const REASON_NSSDB_ADD_COMMAND_FAILURE = `nss list command failure`
const REASON_ADDED_IN_ALL_FIREFOX_NSSDB = `added in all firefox nss database file`

export const addCertificateAuthorityInFirefox = async ({
  logger,
  rootCertificateFileUrl,
  rootCertificate,
  rootCertificateCommonName,
  NSSDynamicInstall,
}) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  logger.info(`Adding certificate authority in Firefox...`)
  const failureMessage = `${failureSign} failed to add certificate authority in Firefox`
  const manualInstallSuggestionMessage = `Ensure ${urlToFileSystemPath(
    rootCertificateFileUrl,
  )} is installed in Firefox as documented in https://wiki.mozilla.org/PSM:Changing_Trust_Settings`

  const nssCommandAvailable = await detectNSSCommand({ logger })
  if (!nssCommandAvailable) {
    if (!NSSDynamicInstall) {
      logger.warn(
        createDetailedMessage(failureMessage, {
          "reason": REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED,
          "suggested solution": manualInstallSuggestionMessage,
          "an other suggested solution": `Allow "nss" dynamic install with NSSDynamicInstall: true`,
        }),
      )
      return {
        status: "unknown",
        reason: REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED,
      }
    }

    if (!commandExists("brew")) {
      logger.warn(
        createDetailedMessage(failureMessage, {
          "reason": REASON_MISSING_NSS_AND_BREW,
          "suggested solution": `install "brew" on this mac`,
          "an other suggested solution": manualInstallSuggestionMessage,
        }),
      )
      return {
        status: "unknown",
        reason: REASON_MISSING_NSS_AND_BREW,
      }
    }

    throw new Error(`To test properly`)
    // const brewInstallCommand = `brew install nss`
    // logger.info(`certutil is not installed, trying to install certutil via Homebrew`)
    // logger.info(`> ${brewInstallCommand}`)
    // try {
    //   await exec(brewInstallCommand)
    // } catch (e) {
    //   logger.error(createDetailedMessage(`brew install nss error`, { "error stack": e.stack }))
    //   return false
    // }
  }

  return executeOnEveryNSSDB({
    logger,
    NSSDBBrowserName: "Firefox",
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
    callback: async ({ directoryArg, NSSDBFileUrl }) => {
      const certutilBinPath = await getCertutilBinPath()
      const certutilAddCommand = `${certutilBinPath} -A -d ${directoryArg} -t C,, -i "${rootCertificate}" -n "${rootCertificateCommonName}"`
      logger.debug(`Adding certificate to ${NSSDBFileUrl}...`)
      logger.debug(`${commandSign} ${certutilAddCommand}`)
      try {
        await exec(certutilAddCommand)
        logger.debug(`${okSign} certificate added`)
      } catch (error) {
        logger.error(failureMessage, {
          "reason": REASON_NSSDB_ADD_COMMAND_FAILURE,
          "error stack": error.stack,
          "suggested solution": manualInstallSuggestionMessage,
        })
        throw error
      }
    },
    onError: () => {
      return {
        status: "not_trusted",
        reason: REASON_NSSDB_ADD_COMMAND_FAILURE,
      }
    },
    onComplete: ({ fileCount }) => {
      if (fileCount === 0) {
        logger.warn(
          createDetailedMessage(failureMessage, {
            "reason": REASON_FIREFOX_NSSDB_NOT_FOUND,
            "suggested solution": manualInstallSuggestionMessage,
          }),
        )
        return {
          status: "unknown",
          reason: REASON_FIREFOX_NSSDB_NOT_FOUND,
        }
      }

      logger.debug(`${okSign} certificate added in ${fileCount} firefox nss database file`)
      logger.info(`${okSign} certificate authority added in Firefox`)
      return {
        status: "trusted",
        reason: REASON_ADDED_IN_ALL_FIREFOX_NSSDB,
      }
    },
  })
}
