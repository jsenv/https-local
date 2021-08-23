/*
 * NSS DB stands for Network Security Service DataBase
 * Certutil command documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/tools/NSS_Tools_certutil
 */

import { collectFiles, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { okSign, warningSign } from "./logs.js"

export const executeOnEveryNSSDB = async ({
  logger,
  NSSDBDirectoryUrl,
  NSSDBBrowserName,
  callback,
  onError,
  onComplete,
}) => {
  logger.debug(`Detecting ${NSSDBBrowserName} bss database files...`)

  const firefoxNSSDBFiles = await findNSSDBFiles({ NSSDBDirectoryUrl })
  const fileCount = firefoxNSSDBFiles.length
  if (fileCount === 0) {
    logger.warn(
      `${warningSign} could not find ${NSSDBBrowserName} nss database file in ${NSSDBDirectoryUrl}`,
    )
    return onComplete({
      fileCount,
    })
  }

  logger.debug(`${okSign} found ${fileCount} ${NSSDBBrowserName} nss database file`)
  try {
    await firefoxNSSDBFiles.reduce(async (previous, NSSDBFile) => {
      await previous

      const NSSDBFileUrl = resolveUrl(resolveUrl(NSSDBFile.relativeUrl, NSSDBDirectoryUrl))
      const NSSDBFileDirectoryUrl = resolveUrl("./", NSSDBFileUrl)
      const { isLegacyNSSDB } = NSSDBFile.meta
      const directoryArg = isLegacyNSSDB
        ? `"${urlToFileSystemPath(NSSDBFileDirectoryUrl)}"`
        : `sql:"${urlToFileSystemPath(NSSDBFileDirectoryUrl)}"`

      await callback({
        NSSDBFile,
        NSSDBFileUrl,
        directoryArg,
      })
    }, Promise.resolve())
  } catch (error) {
    return onError({ error })
  }

  return onComplete({
    fileCount,
  })
}

const findNSSDBFiles = async ({ NSSDBDirectoryUrl }) => {
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
  return NSSDBFiles
}
