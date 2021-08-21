/*
 * NSS DB stands for Network Security Service DataBase
 * Certutil command documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/tools/NSS_Tools_certutil
 */

import { urlToFileSystemPath, resolveUrl, collectFiles } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import { exec } from "./exec.js"

export const searchRootCertificateInNSSDBFiles = async ({
  NSSDBDirectoryUrl,
  rootCertificateCommonName,
  rootCertificate,
  getCertutilBinPath,
}) => {
  const NSSDBFilesWithRootcertificate = []
  const NSSDBFilesWithoutRootCertificate = []
  const NSSDBFiles = await findNSSDBFiles({ NSSDBDirectoryUrl })
  const NSSDBFilesCount = NSSDBFiles.length
  if (NSSDBFilesCount === 0) {
    return {
      NSSDBFilesWithRootcertificate,
      NSSDBFilesWithoutRootCertificate,
    }
  }

  const certutilBinPath = await getCertutilBinPath()
  await forEachNSSDBFile({
    NSSDBFiles,
    NSSDBDirectoryUrl,
    callback: async ({ NSSDBFile, directoryArg }) => {
      const certutilCommand = `${certutilBinPath} -L -a -d ${directoryArg} -n "${rootCertificateCommonName}"`

      try {
        const certutilCommandOutput = await exec(certutilCommand)
        const isInDatabase = rootCertificate === certutilCommandOutput
        if (isInDatabase) {
          NSSDBFilesWithRootcertificate.push(NSSDBFile)
        } else {
          NSSDBFilesWithoutRootCertificate.push(NSSDBFile)
        }
      } catch (e) {
        if (e.message.includes("PR_FILE_NOT_FOUND_ERROR")) {
          NSSDBFilesWithoutRootCertificate.push(NSSDBFile)
          return
        }
        throw e
      }
    },
  })

  return {
    NSSDBFilesWithRootcertificate,
    NSSDBFilesWithoutRootCertificate,
  }
}

export const addRootCertificateToNSSDBFiles = async ({
  NSSDBDirectoryUrl,
  rootCertificateCommonName,
  rootCertificate,
  // rootCertificateFileUrl,
  getCertutilBinPath,
}) => {
  const NSSDBFiles = await findNSSDBFiles({ NSSDBDirectoryUrl })
  const result = {}

  const NSSDBFilesCount = NSSDBFiles.length
  if (NSSDBFilesCount === 0) {
    return result
  }

  const certutilBinPath = await getCertutilBinPath()
  await forEachNSSDBFile({
    NSSDBFiles,
    NSSDBDirectoryUrl,
    callback: async ({ NSSDBFile, directoryArg }) => {
      const certutilCommand = `${certutilBinPath} -A -d ${directoryArg} -t C,, -i "${rootCertificate}" -n "${rootCertificateCommonName}"`
      try {
        await exec(certutilCommand)
        result[NSSDBFile.relativeUrl] = true
      } catch (e) {
        console.error(
          createDetailedMessage(`failed to add root certificate to ${NSSDBFile}`, {
            "error stack": e.stack,
          }),
        )
        result[NSSDBFile.relativeUrl] = false
      }
    },
  })

  return result
}

export const removeRootCertificateFromNSSDBFiles = async ({
  NSSDBDirectoryUrl,
  rootCertificateCommonName,
  rootCertificate,
  // rootCertificateFileUrl,
  getCertutilBinPath,
}) => {
  const NSSDBFiles = await findNSSDBFiles({ NSSDBDirectoryUrl })
  const result = {}

  const NSSDBFilesCount = NSSDBFiles.length
  if (NSSDBFilesCount === 0) {
    return result
  }

  const certutilBinPath = await getCertutilBinPath()
  await forEachNSSDBFile({
    NSSDBFiles,
    NSSDBDirectoryUrl,
    callback: async ({ NSSDBFile, directoryArg }) => {
      const certutilCommand = `${certutilBinPath} -D -d ${directoryArg} -t C,, -i "${rootCertificate}" -n "${rootCertificateCommonName}"`
      try {
        await exec(certutilCommand)
        result[NSSDBFile.relativeUrl] = true
      } catch (e) {
        console.error(
          createDetailedMessage(`failed to remove root certificate from ${NSSDBFile}`, {
            "error stack": e.stack,
          }),
        )
        result[NSSDBFile.relativeUrl] = false
      }
    },
  })
  return result
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

const forEachNSSDBFile = async ({ NSSDBFiles, NSSDBDirectoryUrl, callback }) => {
  await NSSDBFiles.reduce(async (previous, NSSDBFile) => {
    await previous

    const nssDBDirectoryUrl = resolveUrl("./", resolveUrl(NSSDBFile.relativeUrl, NSSDBDirectoryUrl))
    const { isLegacyNSSDB } = NSSDBFile.meta
    const directoryArg = isLegacyNSSDB
      ? `"${urlToFileSystemPath(nssDBDirectoryUrl)}"`
      : `sql:"${urlToFileSystemPath(nssDBDirectoryUrl)}"`

    await callback({
      NSSDBFile,
      directoryArg,
    })
  }, Promise.resolve())
}
