import { execSync } from "node:child_process"
import { createDetailedMessage } from "@jsenv/logger"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import {
  findNSSDBFiles,
  getDirectoryArgFromNSSDBFileUrl,
} from "@jsenv/https-localhost/src/internal/nssdb.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"
import {
  okSign,
  infoSign,
  commandSign,
  failureSign,
  warningSign,
} from "@jsenv/https-localhost/src/internal/logs.js"
import { commandExists } from "@jsenv/https-localhost/src/internal/command.js"
import { searchCertificateInCommandOutput } from "@jsenv/https-localhost/src/internal/search_certificate_in_command_output.js"
import {
  detectNSSCommand,
  detectFirefox,
  firefoxNSSDBDirectoryUrl,
  getCertutilBinPath,
} from "./mac_utils.js"

// get status reasons
const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_MISSING_NSS = `"nss" is not installed`
const REASON_FIREFOX_NSSDB_NOT_FOUND = "could not find Firefox nss database file"
const REASON_NSSDB_LIST_COMMAND_FAILURE = `error while listing nss database certificates`
const REASON_MISSING_IN_SOME_FIREFOX_NSSDB = `missing in some firefox nss database file`
const REASON_OUTDATED_IN_SOME_FIREFOX_NSSDB = `outdated in some firefox nss database file`
const REASON_FOUND_IN_ALL_FIREFOX_NSSDB = `found in all firefox nss database file`
// add status reasons
const REASON_MISSING_NSS_AND_BREW = `"nss" and "brew" are not installed`
const REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED = `"nss" is not installed and NSSDynamicInstall is false`
const REASON_NSSDB_ADD_COMMAND_FAILURE = `nss add command failure`
const REASON_ADDED_IN_ALL_FIREFOX_NSSDB = `added in all firefox nss database file`
// remove status reasons
const REASON_NSSDB_REMOVE_COMMAND_FAILURE = `nss remove command failure`
const REASON_REMOVED_FROM_ALL_FIREFOX_NSSDB = `removed from all firefox nss database file`

export const getCertificateTrustInfoFromFirefox = async ({
  logger,
  certificate,
  certificateCommonName,
} = {}) => {
  const criticalFirefoxTrustInfo = await getCriticalTrustInfo({ logger })
  if (criticalFirefoxTrustInfo) {
    return criticalFirefoxTrustInfo
  }

  logger.debug(`Search Firefox nss database files...`)
  const NSSDBFiles = await findNSSDBFiles({
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    logger.warn(
      `${warningSign} could not find Firefox nss database file in ${firefoxNSSDBDirectoryUrl}`,
    )
    return {
      status: "unknown",
      reason: REASON_FIREFOX_NSSDB_NOT_FOUND,
    }
  }
  logger.debug(`${okSign} found ${fileCount} Firefox nss database file`)

  const missings = []
  const outdateds = []
  const founds = []
  const certutilBinPath = await getCertutilBinPath()
  for (const NSSDBFileUrl of NSSDBFiles) {
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilListCommand = `${certutilBinPath} -L -a -d ${directoryArg} -n "${certificateCommonName}"`
    logger.debug(`Checking if certificate is in nss database...`)
    logger.debug(`${commandSign} ${certutilListCommand}`)
    const { error, output } = await execCertutilCommmand(certutilListCommand)
    if (error) {
      if (error.message.includes("PR_FILE_NOT_FOUND_ERROR")) {
        logger.debug(`${infoSign} certificate not found in nss database`)
        missings.push(NSSDBFileUrl)
        continue
      }
      if (error.message.includes("could not find certificate named")) {
        logger.debug(`${infoSign} certificate not found in nss database`)
        missings.push(NSSDBFileUrl)
        continue
      }
      logger.error(
        createDetailedMessage(`${failureSign} ${REASON_NSSDB_LIST_COMMAND_FAILURE}`, {
          "error stack": error.stack,
        }),
      )
      return {
        status: "unknown",
        reason: REASON_NSSDB_LIST_COMMAND_FAILURE,
      }
    }

    const isInDatabase = searchCertificateInCommandOutput(output, certificate)
    if (isInDatabase) {
      logger.debug(`${okSign} certificate found in nss database`)
      founds.push(NSSDBFileUrl)
      continue
    }

    logger.debug(`${infoSign} certificate in nss database is outdated`)
    outdateds.push(NSSDBFileUrl)
  }

  const missingCount = missings.length
  if (missingCount > 0) {
    logger.debug(`${infoSign} certificate missing in ${missingCount} nss database file`)
    return {
      status: "not_trusted",
      reason: REASON_MISSING_IN_SOME_FIREFOX_NSSDB,
    }
  }

  const outdatedCount = outdateds.length
  if (outdatedCount > 0) {
    logger.debug(`${infoSign} certificate outdated in ${outdatedCount} nss database file`)
    return {
      status: "not_trusted",
      reason: REASON_OUTDATED_IN_SOME_FIREFOX_NSSDB,
    }
  }

  logger.debug(`${okSign} certificate found in ${founds.length} nss database file`)
  return {
    status: "trusted",
    reason: REASON_FOUND_IN_ALL_FIREFOX_NSSDB,
  }
}

// getCertificateTrustInfoFromFirefox({
//   logger: createLogger(),
//   certificateCommonName: "Jsenv localhost root certificate",
// })

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

  logger.debug(`Search Firefox nss database files...`)
  const NSSDBFiles = await findNSSDBFiles({
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
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
  logger.debug(`${okSign} found ${fileCount} Firefox nss database file`)

  await getFirefoxClosedPromise({ logger })
  const certutilBinPath = await getCertutilBinPath()
  for (const NSSDBFileUrl of NSSDBFiles) {
    const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilAddCommand = `${certutilBinPath} -A -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`

    logger.debug(`Adding certificate to nss database...`)
    logger.debug(`${commandSign} ${certutilAddCommand}`)
    const { error } = await execCertutilCommmand(certutilAddCommand)
    if (error) {
      logger.error(failureMessage, {
        "reason": REASON_NSSDB_ADD_COMMAND_FAILURE,
        "error stack": error.stack,
        "suggested solution": manualInstallSuggestionMessage,
      })
      return {
        status: "not_trusted",
        reason: REASON_NSSDB_ADD_COMMAND_FAILURE,
      }
    }
    logger.debug(`${okSign} certificate added`)
  }

  logger.debug(`${okSign} certificate added in ${fileCount} nss database file`)
  logger.info(`${okSign} certificate added in Firefox`)
  return {
    status: "trusted",
    reason: REASON_ADDED_IN_ALL_FIREFOX_NSSDB,
  }
}

export const removeCertificateFromFirefoxTrustStore = async ({
  logger,
  // certificate,
  certificateCommonName,
  certificateFileUrl,
}) => {
  const criticalFirefoxTrustInfo = await getCriticalTrustInfo({ logger })
  if (criticalFirefoxTrustInfo) {
    logger.debug(`No certificate to remove from firefox because ${criticalFirefoxTrustInfo.reason}`)
    return criticalFirefoxTrustInfo
  }

  logger.debug(`Search Firefox nss database files...`)
  const NSSDBFiles = await findNSSDBFiles({
    NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    logger.warn(
      `${warningSign} could not find Firefox nss database file in ${firefoxNSSDBDirectoryUrl}`,
    )
    return {
      status: "unknown",
      reason: REASON_FIREFOX_NSSDB_NOT_FOUND,
    }
  }
  logger.debug(`${okSign} found ${fileCount} Firefox nss database file`)

  logger.info(`Removing certificate from Firefox...`)
  const failureMessage = `${failureSign} failed to remove certificate from Firefox`
  await getFirefoxClosedPromise({ logger })
  const certutilBinPath = await getCertutilBinPath()
  for (const NSSDBFileUrl of NSSDBFiles) {
    const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilRemoveCommand = `${certutilBinPath} -D -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`

    logger.debug(`Removing certificate from nss database...`)
    logger.debug(`${commandSign} ${certutilRemoveCommand}`)
    const { error } = await execCertutilCommmand(certutilRemoveCommand)
    if (error) {
      if (error.message.includes("could not find certificate named")) {
        logger.debug(`${okSign} certificate was not in the nss database`)
        continue
      }
      logger.error(
        createDetailedMessage(failureMessage, {
          "reason": REASON_NSSDB_REMOVE_COMMAND_FAILURE,
          "error stack": error.stack,
        }),
      )
      return {
        status: "not_trusted",
        reason: REASON_NSSDB_REMOVE_COMMAND_FAILURE,
      }
    }
    logger.debug(`${okSign} certificate removed`)
  }

  logger.info(`${okSign} certificate removed from Firefox`)
  return {
    status: "not_trusted",
    reason: REASON_REMOVED_FROM_ALL_FIREFOX_NSSDB,
  }
}

const execCertutilCommmand = async (command) => {
  try {
    const output = await exec(command)
    return { error: null, output }
  } catch (error) {
    return { error, output: null }
  }
}

const getCriticalTrustInfo = async ({ logger }) => {
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

  return null
}

const getFirefoxClosedPromise = async ({ logger }) => {
  if (!isFirefoxOpen()) {
    return
  }

  logger.warn(`${warningSign} waiting for you to close Firefox before resuming...`)
  const next = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    if (isFirefoxOpen()) {
      await next()
    } else {
      logger.info(`${okSign} Firefox closed, resuming`)
      // wait 50ms more to ensure firefox has time to cleanup
      // othrwise sometimes there is an SEC_ERROR_REUSED_ISSUER_AND_SERIAL error
      // because we updated nss database file while firefox is not fully closed
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  await next()
}

const isFirefoxOpen = () => {
  return execSync("ps aux").includes("firefox")
}

// for test
// {
//   const { createLogger } = await import("@jsenv/logger")
//   const { getCertificateAuthorityFileUrls } = await import(
//     "../../certificate_authority_file_urls.js"
//   )
//   const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
//   await removeCertificateFromFirefoxTrustStore({
//     logger: createLogger({ logLevel: "debug" }),
//     certificate: "",
//     certificateCommonName: "Jsenv localhost root certificate",
//     certificateFileUrl: rootCertificateFileUrl,
//   })
// }
