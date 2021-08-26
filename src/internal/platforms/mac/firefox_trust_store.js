import { createDetailedMessage } from "@jsenv/logger"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import { executeOnEveryNSSDB } from "@jsenv/https-localhost/src/internal/nssdb.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"
import {
  okSign,
  infoSign,
  commandSign,
  failureSign,
} from "@jsenv/https-localhost/src/internal/logs.js"
import { commandExists } from "@jsenv/https-localhost/src/internal/command.js"
import { searchCertificateInCommandOutput } from "@jsenv/https-localhost/src/internal/search_certificate_in_command_output.js"
import {
  detectNSSCommand,
  detectFirefox,
  firefoxNSSDBDirectoryUrl,
  getCertutilBinPath,
} from "./mac_utils.js"

const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_MISSING_NSS = `"nss" is not installed`
const REASON_FIREFOX_NSSDB_NOT_FOUND = "could not find Firefox nss database file"
const REASON_NSSDB_LIST_COMMAND_FAILURE = `error while listing nss database certificates`
const REASON_MISSING_IN_SOME_FIREFOX_NSSDB = `missing in some firefox nss database file`
const REASON_FOUND_IN_ALL_FIREFOX_NSSDB = `found in all firefox nss database file`

export const getCertificateTrustInfoFromFirefox = async ({
  logger,
  certificate,
  certificateCommonName,
} = {}) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

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
      const certutilListCommand = `${certutilBinPath} -L -a -d ${directoryArg} -n "${certificateCommonName}"`
      logger.debug(`Checking if certificate authority is in nss database file...`)
      logger.debug(`${commandSign} ${certutilListCommand}`)

      try {
        const certutilCommandOutput = await exec(certutilListCommand)
        const isInDatabase = searchCertificateInCommandOutput(certutilCommandOutput, certificate)
        if (isInDatabase) {
          logger.debug(`${okSign} certificate found in nssdb`)
          founds.push(NSSDBFileUrl)
        } else {
          logger.debug(`${infoSign} certificate in nssdb is outdated`)
          missings.push(NSSDBFileUrl)
        }
      } catch (error) {
        if (error.message.includes("PR_FILE_NOT_FOUND_ERROR")) {
          logger.debug(`${infoSign} certificate authority not found in nssdb`)
          missings.push(NSSDBFileUrl)
          return
        }
        if (error.message.includes("could not find certificate named")) {
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
        logger.debug(`${infoSign} certificate missing in ${missingCount} firefox nss database file`)
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

// getCertificateTrustInfoFromFirefox({
//   logger: createLogger(),
//   certificateCommonName: "Jsenv localhost root certificate",
// })

const REASON_MISSING_NSS_AND_BREW = `"nss" and "brew" are not installed`
const REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED = `"nss" is not installed and NSSDynamicInstall is false`
const REASON_NSSDB_ADD_COMMAND_FAILURE = `nss add command failure`
const REASON_ADDED_IN_ALL_FIREFOX_NSSDB = `added in all firefox nss database file`

export const addCertificateInFirefoxTrustStore = async ({
  logger,
  certificateFileUrl,
  certificateCommonName,
  NSSDynamicInstall,
}) => {
  logger.info(`Adding certificate in Firefox...`)
  const failureMessage = `${failureSign} failed to add certificate in Firefox`
  const manualInstallSuggestionMessage = `Ensure ${urlToFileSystemPath(
    certificateFileUrl,
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
      const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
      const certutilAddCommand = `${certutilBinPath} -A -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`
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
      logger.info(`${okSign} certificate added in Firefox`)
      return {
        status: "trusted",
        reason: REASON_ADDED_IN_ALL_FIREFOX_NSSDB,
      }
    },
  })
}

const REASON_NSSDB_REMOVE_COMMAND_FAILURE = `nss remove command failure`
const REASON_REMOVED_FROM_ALL_FIREFOX_NSSDB = `removed from all firefox nss database file`

export const removeCertificateFromFirefoxTrustStore = async ({
  logger,
  certificate,
  certificateCommonName,
  certificateFileUrl,
}) => {
  const firefoxTrustInfo = await getCertificateTrustInfoFromFirefox({
    logger,
    certificate,
    certificateCommonName,
  })
  if (firefoxTrustInfo.status !== "trusted") {
    logger.debug(`No certificate to remove from firefox because ${firefoxTrustInfo.reason}`)
    return firefoxTrustInfo
  }

  logger.info(`Removing certificate from Firefox...`)
  const failureMessage = `${failureSign} failed to remove certificate from Firefox`
  return executeOnEveryNSSDB({
    logger,
    NSSDBBrowserName: "Firefox",
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
    callback: async ({ directoryArg, NSSDBFileUrl }) => {
      const certutilBinPath = await getCertutilBinPath()
      const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
      const certutilRemoveCommand = `${certutilBinPath} -D -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`
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

// for test
{
  const { createLogger } = await import("@jsenv/logger")
  const { getCertificateAuthorityFileUrls } = await import(
    "../../certificate_authority_file_urls.js"
  )
  const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
  await removeCertificateFromFirefoxTrustStore({
    logger: createLogger({ logLevel: "debug" }),
    certificate: "",
    certificateCommonName: "Jsenv localhost root certificate",
    certificateFileUrl: rootCertificateFileUrl,
  })
}
