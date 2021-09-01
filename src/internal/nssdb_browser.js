/*
 * NSS DB stands for Network Security Service DataBase
 * Certutil command documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/tools/NSS_Tools_certutil
 */

import { existsSync } from "node:fs"
import { createDetailedMessage } from "@jsenv/logger"
import {
  assertAndNormalizeDirectoryUrl,
  collectFiles,
  resolveUrl,
  urlToFilename,
  urlToFileSystemPath,
} from "@jsenv/filesystem"

import {
  commandSign,
  okSign,
  infoSign,
  warningSign,
  failureSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"
import { searchCertificateInCommandOutput } from "@jsenv/local-https-certificates/src/internal/search_certificate_in_command_output.js"
import { VERB_CHECK_TRUST, VERB_ADD_TRUST } from "./trust_query.js"

export const executeTrustQueryOnBrowserNSSDB = async ({
  logger,
  certificateCommonName,
  certificateFileUrl,
  certificateIsNew,
  certificate,

  verb,
  NSSDynamicInstall,
  nssCommandName,
  detectIfNSSIsInstalled,
  getNSSDynamicInstallInfo,
  getCertutilBinPath,

  browserName,
  detectBrowser,
  browserNSSDBDirectoryUrl,
  getBrowserClosedPromise,
}) => {
  const browserDetected = detectBrowser({ logger })
  if (!browserDetected) {
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  if (verb === VERB_CHECK_TRUST && certificateIsNew) {
    logger.info(`${infoSign} You should add certificate to ${browserName}`)
    return {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    }
  }

  logger.info(`Check if certificate is in ${browserName}...`)
  const nssIsInstalled = await detectIfNSSIsInstalled({ logger })
  const cannotCheckMessage = `${failureSign} cannot check if certificate is in ${browserName}`
  if (!nssIsInstalled) {
    if (verb === VERB_ADD_TRUST) {
      const { nssIsInstallable, nssNotInstallableReason, nssInstallFixSuggestion, nssInstall } =
        await getNSSDynamicInstallInfo({ logger })
      if (!nssIsInstallable) {
        const reason = `"${nssCommandName}" is not installed and not cannot be installed`
        logger.warn(
          createDetailedMessage(cannotCheckMessage, {
            reason,
            "reason it cannot be installed": nssNotInstallableReason,
            "suggested solution": nssInstallFixSuggestion,
          }),
        )
        return {
          status: "unknown",
          reason,
        }
      }

      if (!NSSDynamicInstall) {
        const reason = `"${nssCommandName}" is not installed and NSSDynamicInstall is false`
        logger.warn(
          createDetailedMessage(cannotCheckMessage, {
            reason,
            "suggested solution": `Allow "${nssCommandName}" dynamic install with NSSDynamicInstall: true`,
          }),
        )
        return {
          status: "unknown",
          reason,
        }
      }

      try {
        await nssInstall()
      } catch (e) {
        logger.error(
          createDetailedMessage(cannotCheckMessage, {
            "reason": `error while trying to install "${nssCommandName}"`,
            "error stack": e.stack,
          }),
        )
        return {
          status: "unknown",
          reason: `"${nssCommandName}" installation failed`,
        }
      }
    } else {
      const reason = `"${nssCommandName}" is not installed`
      logger.info(
        createDetailedMessage(cannotCheckMessage, {
          reason,
        }),
      )
      return {
        status: "unknown",
        reason,
      }
    }
  }

  const NSSDBFiles = await findNSSDBFiles({
    logger,
    NSSDBDirectoryUrl: browserNSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    const reason = `could not find nss database file`
    logger.warn(createDetailedMessage(cannotCheckMessage), { reason })
    return {
      status: "unknown",
      reason,
    }
  }

  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  const certutilBinPath = await getCertutilBinPath()

  const checkNSSDB = async ({ NSSDBFileUrl }) => {
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilListCommand = `${certutilBinPath} -L -a -d ${directoryArg} -n "${certificateCommonName}"`
    logger.debug(`Checking if certificate is in nss database...`)
    logger.debug(`${commandSign} ${certutilListCommand}`)
    try {
      const output = await execCertutilCommmand(certutilListCommand)
      const isInDatabase = searchCertificateInCommandOutput(output, certificate)
      if (isInDatabase) {
        return "found"
      }
      return "outdated"
    } catch (e) {
      if (isCertificateNotFoundError(e)) {
        return "missing"
      }
      throw e
    }
  }

  const addToNSSDB = async ({ NSSDBFileUrl }) => {
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilAddCommand = `${certutilBinPath} -A -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`
    logger.debug(`Adding certificate to nss database...`)
    logger.debug(`${commandSign} ${certutilAddCommand}`)
    await execCertutilCommmand(certutilAddCommand)
    logger.debug(`${okSign} certificate added to nss database`)
  }

  const removeFromNSSDB = async ({ NSSDBFileUrl }) => {
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilRemoveCommand = `${certutilBinPath} -D -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`
    logger.debug(`Removing certificate from nss database...`)
    logger.debug(`${commandSign} ${certutilRemoveCommand}`)
    await execCertutilCommmand(certutilRemoveCommand)
    logger.debug(`${okSign} certificate removed from nss database`)
  }

  const missings = []
  const outdateds = []
  const founds = []
  await Promise.all(
    NSSDBFiles.map(async (NSSDBFileUrl) => {
      const certificateStatus = await checkNSSDB({ NSSDBFileUrl })

      if (certificateStatus === "missing") {
        logger.debug(`${infoSign} certificate not found in nss database`)
        missings.push(NSSDBFileUrl)
        return
      }

      if (certificateStatus === "outdated") {
        outdateds.push(NSSDBFileUrl)
        return
      }

      logger.debug(`${okSign} certificate found in nss database`)
      founds.push(NSSDBFileUrl)
    }),
  )

  const missingCount = missings.length
  const outdatedCount = outdateds.length
  const foundCount = founds.length

  if (verb === VERB_CHECK_TRUST) {
    if (missingCount > 0 || outdatedCount > 0) {
      logger.info(`${infoSign} certificate not found in ${browserName}`)
      return {
        status: "not_trusted",
        reason: `missing or outdated in ${browserName} nss database file`,
      }
    }
    logger.info(`${okSign} certificate found in ${browserName}`)
    return {
      status: "trusted",
      reason: `found in ${browserName} nss database file`,
    }
  }

  if (verb === VERB_ADD_TRUST) {
    if (missingCount === 0 && outdatedCount === 0) {
      logger.info(`${okSign} certificate found in ${browserName}`)
      return {
        status: "trusted",
        reason: `found in all ${browserName} nss database file`,
      }
    }
    logger.info(`${infoSign} certificate not found in ${browserName}`)
    logger.info(`Adding certificate to ${browserName}...`)
    await getBrowserClosedPromise()
    await Promise.all(
      missings.map(async (missing) => {
        await addToNSSDB({ NSSDBFileUrl: missing })
      }),
    )
    await Promise.all(
      outdateds.map(async (outdated) => {
        await removeFromNSSDB({ NSSDBFileUrl: outdated })
        await addToNSSDB({ NSSDBFileUrl: outdated })
      }),
    )
    logger.info(`${okSign} certificate added to ${browserName}`)
    return {
      status: "trusted",
      reason: `added to ${browserName} nss database file`,
    }
  }

  if (outdatedCount === 0 && foundCount === 0) {
    logger.info(`${infoSign} certificate not found in ${browserName}`)
    return {
      status: "not_trusted",
      reason: `not found in ${browserName} nss database file`,
    }
  }
  logger.info(`${infoSign} found certificate in ${browserName}`)
  logger.info(`Removing certificate from ${browserName}...`)
  await getBrowserClosedPromise()
  await Promise.all(
    outdateds.map(async (outdated) => {
      await removeFromNSSDB({ NSSDBFileUrl: outdated })
    }),
  )
  await Promise.all(
    founds.map(async (found) => {
      await removeFromNSSDB({ NSSDBFileUrl: found })
    }),
  )
  logger.info(`${okSign} certificate removed from ${browserName}`)
  return {
    status: "not_trusted",
    reason: `removed from ${browserName} nss database file`,
  }
}

const isCertificateNotFoundError = (error) => {
  if (error.message.includes("could not find certificate named")) {
    return true
  }
  if (error.message.includes("PR_FILE_NOT_FOUND_ERROR")) {
    return true
  }
  return false
}

const NSSDirectoryCache = {}
const findNSSDBFiles = async ({ logger, NSSDBDirectoryUrl }) => {
  const resultFromCache = NSSDirectoryCache[NSSDBDirectoryUrl]
  if (resultFromCache) {
    return resultFromCache
  }

  logger.debug(`Searching nss database files in directory...`)
  const NSSDBDirectoryPath = urlToFileSystemPath(NSSDBDirectoryUrl)
  const NSSDBDirectoryExists = existsSync(NSSDBDirectoryPath)
  if (!NSSDBDirectoryExists) {
    logger.info(
      `${infoSign} nss database directory not found on filesystem at ${NSSDBDirectoryPath}`,
    )
    NSSDirectoryCache[NSSDBDirectoryUrl] = []
    return []
  }
  NSSDBDirectoryUrl = assertAndNormalizeDirectoryUrl(NSSDBDirectoryUrl)
  const NSSDBFiles = await collectFiles({
    directoryUrl: NSSDBDirectoryUrl,
    structuredMetaMap: {
      isLegacyNSSDB: {
        "./**/cert8.db": true,
      },
      isModernNSSDB: {
        "./**/cert9.db": true,
      },
    },
    predicate: ({ isLegacyNSSDB, isModernNSSDB }) => isLegacyNSSDB || isModernNSSDB,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    logger.warn(`${warningSign} could not find nss database file in ${NSSDBDirectoryUrl}`)
    NSSDirectoryCache[NSSDBDirectoryUrl] = []
    return []
  }

  logger.debug(`${okSign} found ${fileCount} nss database file in ${NSSDBDirectoryUrl}`)
  const files = NSSDBFiles.map((file) => {
    return resolveUrl(file.relativeUrl, NSSDBDirectoryUrl)
  })
  NSSDirectoryCache[NSSDBDirectoryUrl] = files
  return files
}

const getDirectoryArgFromNSSDBFileUrl = (NSSDBFileUrl) => {
  const nssDBFilename = urlToFilename(NSSDBFileUrl)
  const nssDBDirectoryUrl = resolveUrl("./", NSSDBFileUrl)
  const nssDBDirectoryPath = urlToFileSystemPath(nssDBDirectoryUrl)
  return nssDBFilename === "cert8.db" ? `"${nssDBDirectoryPath}"` : `sql:"${nssDBDirectoryPath}"`
}

const execCertutilCommmand = async (command) => {
  const output = await exec(command)
  return output
}
