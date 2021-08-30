/*
 * NSS DB stands for Network Security Service DataBase
 * Certutil command documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/tools/NSS_Tools_certutil
 */

import { createDetailedMessage } from "@jsenv/logger"
import { collectFiles, resolveUrl, urlToFilename, urlToFileSystemPath } from "@jsenv/filesystem"

import {
  commandSign,
  okSign,
  infoSign,
  warningSign,
  failureSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"
import { searchCertificateInCommandOutput } from "@jsenv/local-https-certificates/src/internal/search_certificate_in_command_output.js"

export const getCertificateTrustInfoFromBrowserNSSDB = async ({
  logger,
  certificate,
  certificateCommonName,
  newAndTryToTrustDisabled,

  browserName,
  detectBrowser,
  browserNSSDBDirectoryUrl,

  nssCommandName,
  detectIfNSSIsInstalled,
  getCertutilBinPath,
}) => {
  const browserDetected = detectBrowser({ logger })
  if (!browserDetected) {
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to ${browserName}`)
    return {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    }
  }

  logger.info(`Check if certificate is trusted by ${browserName}...`)
  const nssIsInstalled = await detectIfNSSIsInstalled({ logger })
  if (!nssIsInstalled) {
    const reason = `"${nssCommandName}" is not installed`
    logger.info(
      createDetailedMessage(
        `${failureSign} Unable to detect if certificate is trusted by ${browserName}`,
        {
          reason,
        },
      ),
    )
    return {
      status: "unknown",
      reason,
    }
  }

  const NSSDBFiles = await findNSSDBFiles({
    logger,
    NSSDBDirectoryUrl: browserNSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    const reason = `could not find nss database file`
    logger.warn(
      createDetailedMessage(
        `${failureSign} Unable to detect if certificate is trusted by ${browserName}`,
      ),
      { reason },
    )
    return {
      status: "unknown",
      reason,
    }
  }

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
      console.error(error)
      const reason = `error while listing nss database certificates`
      logger.warn(
        createDetailedMessage(
          `${failureSign} Unable to detect if certificate is trusted by ${browserName}`,
        ),
        { reason },
      )
      return {
        status: "unknown",
        reason,
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
  const outdatedCount = outdateds.length
  const foundCount = founds.length

  if (missingCount > 0) {
    logger.debug(`${infoSign} certificate missing in ${missingCount} nss database file`)
    logger.info(`${infoSign} certificate not trusted by ${browserName}`)
    return {
      status: "not_trusted",
      reason: `missing in some ${browserName} nss database file`,
    }
  }

  if (outdatedCount > 0) {
    logger.debug(`${infoSign} certificate outdated in ${outdatedCount} nss database file`)
    logger.info(`${infoSign} certificate not trusted by ${browserName}`)
    return {
      status: "not_trusted",
      reason: `outdated in some ${browserName} nss database file`,
    }
  }

  logger.debug(`${okSign} certificate found in ${foundCount} nss database file`)
  logger.info(`${okSign} certificate trusted by ${browserName}`)
  return {
    status: "trusted",
    reason: `found in all ${browserName} nss database file`,
  }
}

export const addCertificateInBrowserNSSDB = async ({
  logger,
  certificateFileUrl,
  certificateCommonName,
  NSSDynamicInstall,
  existingTrustInfo,

  browserName,
  detectBrowser,
  browserNSSDBDirectoryUrl,
  getBrowserClosedPromise,

  nssCommandName,
  detectIfNSSIsInstalled,
  getNSSDynamicInstallInfo,
  getCertutilBinPath,
}) => {
  if (existingTrustInfo && existingTrustInfo[browserName].status === "other") {
    return existingTrustInfo[browserName]
  }

  const browserDetected = detectBrowser({ logger })
  if (!browserDetected) {
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  logger.info(`Adding certificate in ${browserName}...`)
  const nssIsInstalled = await detectIfNSSIsInstalled({
    logger,
  })
  if (!nssIsInstalled) {
    const { nssIsInstallable, nssNotInstallableReason, nssInstallFixSuggestion, nssInstall } =
      await getNSSDynamicInstallInfo({ logger })
    if (!nssIsInstallable) {
      const reason = `"${nssCommandName}" is not installed and not cannot be installed`
      logger.warn(
        createDetailedMessage(`${failureSign} cannot add certificate in ${browserName}`, {
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
        createDetailedMessage(`${failureSign} cannot add certificate in ${browserName}`, {
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
        createDetailedMessage(`${failureSign} cannot add certificate in ${browserName}`, {
          "reason": `error while trying to install "${nssCommandName}"`,
          "error stack": e.stack,
        }),
      )
      return {
        status: "unknown",
        reason: `"${nssCommandName}" installation failed`,
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
    logger.warn(
      createDetailedMessage(`${failureSign} failed to add certificate in ${browserName}`, {
        reason,
      }),
    )
    return {
      status: "not_trusted",
      reason,
    }
  }

  await getBrowserClosedPromise()
  const certutilBinPath = await getCertutilBinPath()
  for (const NSSDBFileUrl of NSSDBFiles) {
    const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
    const directoryArg = getDirectoryArgFromNSSDBFileUrl(NSSDBFileUrl)
    const certutilAddCommand = `${certutilBinPath} -A -d ${directoryArg} -t C,, -i "${certificateFilePath}" -n "${certificateCommonName}"`

    logger.debug(`Adding certificate to nss database...`)
    logger.debug(`${commandSign} ${certutilAddCommand}`)
    const { error } = await execCertutilCommmand(certutilAddCommand)
    if (error) {
      console.error(error)
      const reason = `error while adding certificate in nss database file`
      logger.warn(
        createDetailedMessage(`${failureSign} Unable to add certificate in ${browserName}`),
        { reason },
      )
      return {
        status: "not_trusted",
        reason,
      }
    }
    logger.debug(`${okSign} certificate added`)
  }

  logger.debug(`${okSign} certificate added in ${fileCount} nss database file`)
  logger.info(`${okSign} certificate added in Firefox`)
  return {
    status: "trusted",
    reason: `added in all nss database file`,
  }
}

export const removeCertificateFromBrowserNSSDB = async ({
  logger,
  // certificate,
  certificateCommonName,
  certificateFileUrl,

  browserName,
  detectBrowser,
  browserNSSDBDirectoryUrl,
  getBrowserClosedPromise,

  nssCommandName,
  detectIfNSSIsInstalled,
  getCertutilBinPath,
}) => {
  const browserDetected = detectBrowser({ logger })
  if (!browserDetected) {
    logger.debug(`No certificate to remove from ${browserName} because it is not detected`)
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  const nssIsInstalled = await detectIfNSSIsInstalled({ logger })
  if (!nssIsInstalled) {
    // when nss is not installed we couldn't trust certificate so there is likely
    // no certificate to remove -> log level is debug
    logger.debug(
      `Cannot remove certificate from ${browserName} because "${nssCommandName}" is not installed`,
    )
    return {
      status: "unknown",
      reason: `"${nssCommandName}" is not installed`,
    }
  }

  logger.info(`Removing certificate from ${browserName}...`)
  const NSSDBFiles = await findNSSDBFiles({
    logger,
    NSSDBDirectoryUrl: browserNSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    const reason = `could not find nss database file`
    logger.warn(
      createDetailedMessage(`${failureSign} failed to remove certificate from ${browserName}`, {
        reason,
      }),
    )
    return {
      status: "unknown",
      reason,
    }
  }

  await getBrowserClosedPromise()
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
      console.error(error)
      const reason = `error while removing certificate from nss database file`
      logger.warn(
        createDetailedMessage(`${failureSign} failed to remove certificate from ${browserName}`, {
          reason,
        }),
      )
      return {
        status: "unknown",
        reason,
      }
    }
    logger.debug(`${okSign} certificate removed`)
  }

  logger.info(`${okSign} certificate removed from ${browserName}`)
  return {
    status: "not_trusted",
    reason: `removed from all nss database file`,
  }
}

const NSSDirectoryCache = {}
const findNSSDBFiles = async ({ logger, NSSDBDirectoryUrl }) => {
  const resultFromCache = NSSDirectoryCache[NSSDBDirectoryUrl]
  if (resultFromCache) {
    return resultFromCache
  }

  logger.debug(`Searching nss database files in directory...`)
  const NSSDBFiles = await collectFiles({
    directoryUrl: NSSDBDirectoryUrl,
    structuredMetaMap: {
      isLegacyNSSDB: {
        "./**/*/cert8.db": true,
      },
      isModernNSSDB: {
        "./**/*/cert9.db": true,
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
  const files = NSSDBFiles.map((file) => resolveUrl(file.relativeUrl, NSSDBDirectoryUrl))
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
  try {
    const output = await exec(command)
    return { error: null, output }
  } catch (error) {
    return { error, output: null }
  }
}
