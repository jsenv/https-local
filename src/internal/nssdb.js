/*
 * NSS DB stands for Network Security Service DataBase
 * Certutil command documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/tools/NSS_Tools_certutil
 */

import { collectFiles, resolveUrl, urlToFilename, urlToFileSystemPath } from "@jsenv/filesystem"

export const findNSSDBFiles = async ({ NSSDBDirectoryUrl }) => {
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
  return NSSDBFiles.map((file) => resolveUrl(file.relativeUrl, NSSDBDirectoryUrl))
}

export const getDirectoryArgFromNSSDBFileUrl = (NSSDBFileUrl) => {
  const nssDBFilename = urlToFilename(NSSDBFileUrl)
  const nssDBDirectoryUrl = resolveUrl("./", NSSDBFileUrl)
  const nssDBDirectoryPath = urlToFileSystemPath(nssDBDirectoryUrl)
  return nssDBFilename === "cert8.db" ? `"${nssDBDirectoryPath}"` : `sql:"${nssDBDirectoryPath}"`
}
