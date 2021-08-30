/*
 * NSS DB stands for Network Security Service DataBase
 * Certutil command documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/tools/NSS_Tools_certutil
 */

import { collectFiles, resolveUrl, urlToFilename, urlToFileSystemPath } from "@jsenv/filesystem"

import {
  okSign,
  infoSign,
  commandSign,
  warningSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"
import { searchCertificateInCommandOutput } from "@jsenv/local-https-certificates/src/internal/search_certificate_in_command_output.js"

export const getCertificateInfoFromNSSDB = async ({
  logger,
  NSSDBDirectoryUrl,
  getCertutilBinPath,

  certificate,
  certificateCommonName,
}) => {
  const NSSDBFiles = await findNSSDBFiles({
    logger,
    NSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    return {
      failed: true,
      reason: `could not find nss database file`,
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
      return {
        failed: true,
        reason: `error while listing nss database certificates`,
        error,
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
  return {
    failed: false,
    missingCount,
    outdatedCount,
    foundCount,
  }
}

export const addCertificateToNSSDB = async ({
  logger,
  NSSDBDirectoryUrl,
  getCertutilBinPath,
  getBrowserClosedPromise = () => Promise.resolve(),

  certificateCommonName,
  certificateFileUrl,
}) => {
  const NSSDBFiles = await findNSSDBFiles({
    logger,
    NSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    return {
      failed: true,
      reason: `could not find nss database file`,
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
      return {
        failed: true,
        reason: `nss add command failure`,
        error,
      }
    }
    logger.debug(`${okSign} certificate added`)
  }

  logger.debug(`${okSign} certificate added in ${fileCount} nss database file`)
  return {
    failed: false,
    reason: `added in all nss database file`,
  }
}

export const removeCertificateFromNSSDB = async ({
  logger,
  NSSDBDirectoryUrl,
  getBrowserClosedPromise,
  getCertutilBinPath,

  certificateCommonName,
  certificateFileUrl,
}) => {
  const NSSDBFiles = await findNSSDBFiles({
    NSSDBDirectoryUrl,
  })
  const fileCount = NSSDBFiles.length
  if (fileCount === 0) {
    return {
      failed: true,
      reason: `could not find nss database file`,
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
      return {
        failed: true,
        reason: `nss remove command failure`,
        error,
      }
    }
    logger.debug(`${okSign} certificate removed`)
  }

  return {
    failed: false,
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
