/* eslint-disable import/max-dependencies */

import { createLogger, createDetailedMessage } from "@jsenv/logger"
import { readFile, writeFile, removeFileSystemNode } from "@jsenv/filesystem"

import {
  createValidityDurationOfXYears,
  verifyRootCertificateValidityDuration,
} from "./validity_duration.js"
import { infoSign, okSign } from "./internal/logs.js"

import { getAuthorityFileInfos } from "./internal/authority_file_infos.js"
import { attributeDescriptionFromAttributeArray } from "./internal/certificate_data_converter.js"
import { formatTimeDelta, formatDuration } from "./internal/validity_formatting.js"
import { importNodeForge } from "./internal/forge.js"
import { createAuthorityRootCertificate } from "./internal/certificate_generator.js"
import { importPlatformMethods } from "./internal/platform.js"

const jsenvParameters = {
  certificateCommonName: "Jsenv localhost root certificate",
  certificateValidityDurationInMs: createValidityDurationOfXYears(20),
}

// const jsenvCertificateParams = {
//   rootCertificateOrganizationName: "jsenv",
//   rootCertificateOrganizationalUnitName: "https-localhost",
//   rootCertificateCountryName: "FR",
//   rootCertificateStateOrProvinceName: "Alpes Maritimes",
//   rootCertificateLocalityName: "Valbonne",
// }

export const installCertificateAuthority = async ({
  logLevel,
  logger = createLogger({ logLevel }),

  certificateCommonName = jsenvParameters.certificateCommonName,
  certificateValidityDurationInMs = jsenvParameters.certificateValidityDurationInMs,

  tryToTrust = false,
  NSSDynamicInstall = false,

  // for unit tests
  aboutToExpireRatio = 0.05,
} = {}) => {
  if (typeof certificateCommonName !== "string") {
    throw new TypeError(
      `certificateCommonName must be a string but received ${certificateCommonName}`,
    )
  }
  if (typeof certificateValidityDurationInMs !== "number") {
    throw new TypeError(
      `certificateValidityDurationInMs must be a number but received ${certificateValidityDurationInMs}`,
    )
  }
  if (certificateValidityDurationInMs < 1) {
    throw new TypeError(
      `certificateValidityDurationInMs must be > 0 but received ${certificateValidityDurationInMs}`,
    )
  }

  const validityDurationInfo = verifyRootCertificateValidityDuration(
    certificateValidityDurationInMs,
  )
  if (!validityDurationInfo.ok) {
    certificateValidityDurationInMs = validityDurationInfo.maxAllowedValue
    logger.warn(
      createDetailedMessage(validityDurationInfo.message, {
        details: validityDurationInfo.details,
      }),
    )
  }

  const { authorityJsonFileInfo, rootCertificateFileInfo, rootCertificatePrivateKeyFileInfo } =
    getAuthorityFileInfos()
  const authorityJsonFileUrl = authorityJsonFileInfo.url
  const rootCertificateFileUrl = rootCertificateFileInfo.url
  const rootPrivateKeyFileUrl = rootCertificatePrivateKeyFileInfo.url
  const platformMethods = await importPlatformMethods()

  const generateRootCertificate = async () => {
    logger.info(`Generating authority root certificate...`)
    const { rootCertificateForgeObject, rootCertificatePrivateKeyForgeObject } =
      await createAuthorityRootCertificate({
        logger,
        commonName: certificateCommonName,
        validityDurationInMs: certificateValidityDurationInMs,
        serialNumber: 0,
      })

    const { pki } = await importNodeForge()
    const rootCertificate = pemAsFileContent(pki.certificateToPem(rootCertificateForgeObject))
    const rootCertificatePrivateKey = pemAsFileContent(
      pki.privateKeyToPem(rootCertificatePrivateKeyForgeObject),
    )

    await writeFile(rootCertificateFileUrl, rootCertificate)
    await writeFile(rootPrivateKeyFileUrl, rootCertificatePrivateKey)
    await writeFile(authorityJsonFileUrl, JSON.stringify({ serialNumber: 0 }, null, "  "))

    logger.info(
      `${okSign} authority root certificate valid for ${formatDuration(
        certificateValidityDurationInMs,
      )} written at ${rootCertificateFileInfo.path}`,
    )
    return {
      rootCertificateForgeObject,
      rootCertificatePrivateKeyForgeObject,
      rootCertificate,
      rootCertificatePrivateKey,
    }
  }

  const generate = async () => {
    const {
      rootCertificateForgeObject,
      rootCertificatePrivateKeyForgeObject,
      rootCertificate,
      rootCertificatePrivateKey,
    } = await generateRootCertificate()

    const trustInfo = tryToTrust
      ? await platformMethods.addCertificateToTrustStores({
          logger,
          certificate: rootCertificate,
          certificateFileUrl: rootCertificateFileUrl,
          certificateCommonName,
          NSSDynamicInstall,
        })
      : await platformMethods.getNewCertificateTrustInfo()

    return {
      rootCertificateForgeObject,
      rootCertificatePrivateKeyForgeObject,
      rootCertificate,
      rootCertificatePrivateKey,
      rootCertificateFilePath: rootCertificateFileInfo.path,
      trustInfo,
    }
  }

  const regenerate = async () => {
    if (tryToTrust) {
      await platformMethods.removeCertificateFromTrustStores({
        logger,
        certificate: rootCertificate,
        certificateFileUrl: rootCertificateFileUrl,
        certificateCommonName,
      })
    }
    return generate()
  }

  logger.info(`Search existing certificate authority on filesystem...`)
  if (!rootCertificateFileInfo.exists) {
    logger.debug(
      `Authority root certificate file is not on filesystem at ${rootCertificateFileInfo.path}`,
    )
    logger.info(`${infoSign} no certificate authority on filesystem`)
    return generate()
  }
  if (!rootCertificatePrivateKeyFileInfo.exists) {
    logger.debug(
      `Authority root certificate private key file is not on filesystem at ${rootCertificatePrivateKeyFileInfo.path}`,
    )
    logger.info(`${infoSign} no certificate authority on filesystem`)
    return generate()
  }
  logger.debug(
    `found authority root certificate files at ${rootCertificateFileInfo.path} and ${rootCertificatePrivateKeyFileInfo.path}`,
  )
  logger.info(`${okSign} certificate authority found on filesystem`)

  const rootCertificate = await readFile(rootCertificateFileInfo.path, { as: "string" })
  const { pki } = await importNodeForge()
  const rootCertificateForgeObject = pki.certificateFromPem(rootCertificate)

  logger.info(`Checking certificate validity...`)
  const rootCertificateValidityDurationInMs = getCertificateValidityDurationInMs(
    rootCertificateForgeObject,
  )
  const rootCertificateValidityRemainingMs = getCertificateRemainingMs(rootCertificateForgeObject)
  if (rootCertificateValidityRemainingMs < 0) {
    logger.info(
      `${infoSign} certificate expired ${formatTimeDelta(rootCertificateValidityRemainingMs)}`,
    )
    return regenerate()
  }
  const rootCertificateValidityRemainingRatio =
    rootCertificateValidityRemainingMs / rootCertificateValidityDurationInMs
  if (rootCertificateValidityRemainingRatio < aboutToExpireRatio) {
    logger.info(
      `${infoSign} certificate will expire ${formatTimeDelta(rootCertificateValidityRemainingMs)}`,
    )
    return regenerate()
  }
  logger.info(
    `${okSign} certificate valid for ${formatDuration(rootCertificateValidityRemainingMs)}`,
  )

  logger.info(`Detect if certificate attributes have changed...`)
  const rootCertificateDifferences = compareRootCertificateAttributes(rootCertificateForgeObject, {
    certificateCommonName,
    certificateValidityDurationInMs,
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.info(`${infoSign} certificate attributes are outdated: ${paramNames}`)
    return regenerate()
  }
  logger.info(`${okSign} certificate attributes are the same`)

  const rootCertificatePrivateKey = await readFile(rootCertificatePrivateKeyFileInfo.path, {
    as: "string",
  })
  const rootCertificatePrivateKeyForgeObject = pki.privateKeyFromPem(rootCertificatePrivateKey)

  const existingTrustInfo = await platformMethods.getCertificateTrustInfo({
    logger,
    certificate: rootCertificate,
    certificateCommonName: attributeDescriptionFromAttributeArray(
      rootCertificateForgeObject.subject.attributes,
    ).commonName,
  })

  const trustInfo = tryToTrust
    ? await platformMethods.addCertificateToTrustStores({
        logger,
        certificate: rootCertificate,
        certificateFileUrl: rootCertificateFileInfo.url,
        certificateCommonName,
        NSSDynamicInstall,
        existingTrustInfo,
      })
    : existingTrustInfo

  return {
    rootCertificateForgeObject,
    rootCertificatePrivateKeyForgeObject,
    rootCertificate,
    rootCertificatePrivateKey,
    rootCertificateFilePath: rootCertificateFileInfo.path,
    trustInfo,
  }
}

// const getCertificateValidSinceInMs = (forgeCertificate) => {
//   const { notBefore } = forgeCertificate.validity
//   const nowDate = Date.now()
//   const msEllapsedSinceValid = nowDate - notBefore
//   return msEllapsedSinceValid
// }

const getCertificateRemainingMs = (certificateForgeObject) => {
  const { notAfter } = certificateForgeObject.validity
  const nowDate = Date.now()
  const remainingMs = notAfter - nowDate
  return remainingMs
}

const getCertificateValidityDurationInMs = (certificateForgeObject) => {
  const { notBefore, notAfter } = certificateForgeObject.validity
  const validityDurationInMs = notAfter - notBefore
  return validityDurationInMs
}

const compareRootCertificateAttributes = (
  rootCertificateForgeObject,
  { certificateCommonName, certificateValidityDurationInMs },
) => {
  const attributeDescription = attributeDescriptionFromAttributeArray(
    rootCertificateForgeObject.subject.attributes,
  )
  const differences = {}

  const { commonName } = attributeDescription
  if (commonName !== certificateCommonName) {
    differences.certificateCommonName = {
      valueFromCertificate: commonName,
      valueFromParam: certificateCommonName,
    }
  }

  const { notBefore, notAfter } = rootCertificateForgeObject.validity
  const rootCertificateValidityDurationInMs = notAfter - notBefore
  if (rootCertificateValidityDurationInMs !== certificateValidityDurationInMs) {
    differences.rootCertificateValidityDurationInMs = {
      valueFromCertificate: rootCertificateValidityDurationInMs,
      valueFromParam: certificateValidityDurationInMs,
    }
  }

  return differences
}

export const uninstallCertificateAuthority = async ({
  logLevel,
  logger = createLogger({ logLevel }),
  tryToUntrust = false,
} = {}) => {
  const { authorityJsonFileInfo, rootCertificateFileInfo, rootCertificatePrivateKeyFileInfo } =
    getAuthorityFileInfos()

  const filesToRemove = []

  if (authorityJsonFileInfo.exists) {
    filesToRemove.push(authorityJsonFileInfo.url)
  }
  if (rootCertificateFileInfo.exists) {
    // first untrust the root cert file
    if (tryToUntrust) {
      const rootCertificate = await readFile(rootCertificateFileInfo.url, { as: "string" })
      const { pki } = await importNodeForge()
      const rootCertificateForgeObject = pki.certificateFromPem(rootCertificate)
      const rootCertificateCommonName = attributeDescriptionFromAttributeArray(
        rootCertificateForgeObject.subject.attributes,
      ).commonName
      const { removeCertificateFromTrustStores } = await importPlatformMethods()
      await removeCertificateFromTrustStores({
        logger,
        certificate: rootCertificate,
        certificateFileUrl: rootCertificateFileInfo.url,
        certificateCommonName: rootCertificateCommonName,
      })
    }
    filesToRemove.push(rootCertificateFileInfo.url)
  }
  if (rootCertificatePrivateKeyFileInfo.exists) {
    filesToRemove.push(rootCertificatePrivateKeyFileInfo.url)
  }

  if (filesToRemove.length) {
    logger.info(`Removing certificate authority files...`)
    await Promise.all(
      filesToRemove.map(async (file) => {
        await removeFileSystemNode(file)
      }),
    )
    logger.info(`${okSign} certificate authority files removed from filesystem`)
  }
}

const pemAsFileContent = (pem) => {
  if (process.platform === "win32") {
    return pem
  }
  // prefer \n when writing pem into files
  return pem.replace(/\r\n/g, "\n")
}

/*
 * The root certificate files can be "hard" to find because
 * located in a dedicated application directory specific to the OS
 * To make them easier to find, we write symbolic links near the server
 * certificate file pointing to the root certificate files
 */
// if (!isWindows) { // not on windows because symlink requires admin rights
//   logger.debug(`Writing root certificate symbol link files`)
//   await writeSymbolicLink({
//     from: rootCertificateSymlinkUrl,
//     to: rootCertificateFileUrl,
//     type: "file",
//     allowUseless: true,
//     allowOverwrite: true,
//   })
//   await writeSymbolicLink({
//     from: rootPrivateKeySymlinkUrl,
//     to: rootPrivateKeyFileUrl,
//     type: "file",
//     allowUseless: true,
//     allowOverwrite: true,
//   })
//   logger.debug(`Root certificate symbolic links written`)
// }
