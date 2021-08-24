/* eslint-disable import/max-dependencies */

import { existsSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import { urlToFileSystemPath, readFile, writeFile, removeFileSystemNode } from "@jsenv/filesystem"

import { createValidityDurationOfXYears } from "./validity_duration.js"
import { infoSign, okSign } from "./internal/logs.js"
import { getCertificateAuthorityFileUrls } from "./internal/certificate_authority_file_urls.js"
import { attributeDescriptionFromAttributeArray } from "./internal/certificate_data_converter.js"
import { formatTimeDelta, formatDuration } from "./internal/validity_formatting.js"
import { importNodeForge } from "./internal/forge.js"
import { createCertificateAuthority } from "./internal/certificate_generator.js"
import { importPlatformMethods } from "./internal/platform.js"

const jsenvParameters = {
  rootCertificateCommonName: "Jsenv localhost root certificate",
  rootCertificateValidityDurationInMs: createValidityDurationOfXYears(20),
}

export const installCertificateAuthority = async ({
  logLevel,
  logger = createLogger({ logLevel }),

  rootCertificateCommonName = jsenvParameters.rootCertificateCommonName,
  rootCertificateValidityDurationInMs = jsenvParameters.rootCertificateValidityDurationInMs,

  tryToTrust = false,
  NSSDynamicInstall = false,

  // for unit tests
  aboutToExpireRatio = 0.05,
} = {}) => {
  const { authorityJsonFileInfo, rootCertificateFileInfo, rootPrivateKeyFileInfo } =
    getAuthorityFileInfos()
  const authorityJsonFileUrl = authorityJsonFileInfo.url
  const rootCertificateFileUrl = rootCertificateFileInfo.url
  const rootPrivateKeyFileUrl = rootPrivateKeyFileInfo.url
  const platformMethods = await importPlatformMethods()

  const generateRootCertificate = async () => {
    logger.info(`Generating authority certificate...`)
    const { forgeCertificate, privateKey } = await createCertificateAuthority({
      logger,
      commonName: rootCertificateCommonName,
      validityDurationInMs: rootCertificateValidityDurationInMs,
      serialNumber: 0,
    })

    const { pki } = await importNodeForge()
    const rootCertificate = pki.certificateToPem(forgeCertificate)
    const rootPrivateKey = pki.privateKeyToPem(privateKey)
    await writeFile(rootCertificateFileUrl, rootCertificate)
    await writeFile(rootPrivateKeyFileUrl, rootPrivateKey)
    await writeFile(authorityJsonFileUrl, JSON.stringify({ serialNumber: 0 }, null, "  "))

    logger.info(`${okSign} authority certificate written at ${rootCertificateFileInfo.path}`)
    return {
      rootForgeCertificate: forgeCertificate,
      rootForgePrivateKey: privateKey,
      rootCertificate,
      rootPrivateKey,
      rootCertificateFileUrl,
    }
  }

  const generate = async () => {
    const {
      rootForgeCertificate,
      rootForgePrivateKey,
      rootCertificate,
      rootPrivateKey,
      rootCertificateFileUrl,
    } = await generateRootCertificate()

    const trustInfo = await platformMethods.addCertificateAuthority({
      logger,
      tryToTrust,
      NSSDynamicInstall,
      rootCertificate,
      rootCertificateCommonName,
      rootCertificateFileUrl,
    })

    return {
      rootForgeCertificate,
      rootForgePrivateKey,
      rootCertificate,
      rootPrivateKey,
      rootCertificatePath: rootCertificateFileInfo.path,
      trustInfo,
    }
  }

  const regenerate = async () => {
    await platformMethods.removeCertificateAuthority({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
      rootCertificateCommonName,
    })
    return generate()
  }

  logger.info(`Detect existing certificate authority...`)
  if (!rootCertificateFileInfo.exists) {
    logger.debug(
      `Authority certificate file is not on filesystem at ${rootCertificateFileInfo.path}`,
    )
    logger.info(`${infoSign} no certificate authority found`)
    return generate()
  }
  if (!rootPrivateKeyFileInfo.exists) {
    logger.debug(
      `Authority private key file is not on filesystem at ${rootPrivateKeyFileInfo.path}`,
    )
    logger.info(`${infoSign} no certificate authority found`)
    return generate()
  }
  logger.debug(
    `found authority files at ${rootCertificateFileInfo.path} and ${rootPrivateKeyFileInfo.path}`,
  )
  logger.info(`${okSign} found an existing certificate authority`)

  const rootCertificate = await readFile(rootCertificateFileInfo.path, { as: "string" })
  const rootPrivateKey = await readFile(rootPrivateKeyFileInfo.path, { as: "string" })
  const { pki } = await importNodeForge()
  const rootForgeCertificate = pki.certificateFromPem(rootCertificate)
  const rootForgePrivateKey = pki.privateKeyFromPem(rootPrivateKey)

  logger.info(`Checking certificate validity...`)
  const validityDurationInMs = getCertificateValidityDurationInMs(rootForgeCertificate)
  const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
  const validityRemainingMsRatio = validityRemainingMs / validityDurationInMs
  if (validityRemainingMs < 0) {
    logger.info(`${infoSign} certificate has expired ${formatTimeDelta(validityRemainingMs)}`)
    return regenerate()
  }
  if (validityRemainingMsRatio < aboutToExpireRatio) {
    logger.info(`${infoSign} certificate will expire in ${formatTimeDelta(validityRemainingMs)}`)
    return regenerate()
  }
  logger.info(`${okSign} certificate valid for ${formatDuration(validityRemainingMs)}`)

  logger.info(`Detect if certificate attributes have changed...`)
  const rootCertificateDifferences = compareRootCertificateAttributes(rootForgeCertificate, {
    rootCertificateCommonName,
    rootCertificateValidityDurationInMs,
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.info(`${infoSign} certificate attributes are outdated: ${paramNames}`)
    return regenerate()
  }
  logger.info(`${okSign} certificate attributes are the same`)

  const existingTrustInfo = await platformMethods.getCertificateAuthorityTrustInfo({
    logger,
    rootCertificate,
    rootCertificateCommonName: attributeDescriptionFromAttributeArray(
      rootForgeCertificate.subject.attributes,
    ).commonName,
  })

  const trustInfo = await platformMethods.addCertificateAuthority({
    logger,
    tryToTrust,
    NSSDynamicInstall,
    rootCertificate,
    rootCertificateFileUrl: rootCertificateFileInfo.url,
    rootCertificateCommonName,
    existingTrustInfo,
  })
  return {
    rootForgeCertificate,
    rootForgePrivateKey,
    rootCertificate,
    rootPrivateKey,
    rootCertificatePath: rootCertificateFileInfo.path,
    trustInfo: {
      ...existingTrustInfo,
      ...trustInfo,
    },
  }
}

const getAuthorityFileInfos = () => {
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  const authorityJsonFilePath = urlToFileSystemPath(certificateAuthorityJsonFileUrl)
  const authorityJsonFileDetected = existsSync(authorityJsonFilePath)

  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)
  const rootCertificateFileDetected = existsSync(rootCertificateFilePath)

  const rootPrivateKeyFilePath = urlToFileSystemPath(rootPrivateKeyFileUrl)
  const rootPrivateKeyFileDetected = existsSync(rootPrivateKeyFilePath)

  return {
    authorityJsonFileInfo: {
      url: certificateAuthorityJsonFileUrl,
      path: authorityJsonFilePath,
      exists: authorityJsonFileDetected,
    },
    rootCertificateFileInfo: {
      url: rootCertificateFileUrl,
      path: rootCertificateFilePath,
      exists: rootCertificateFileDetected,
    },
    rootPrivateKeyFileInfo: {
      url: rootPrivateKeyFileUrl,
      path: rootPrivateKeyFilePath,
      exists: rootPrivateKeyFileDetected,
    },
  }
}

// const getCertificateValidSinceInMs = (forgeCertificate) => {
//   const { notBefore } = forgeCertificate.validity
//   const nowDate = Date.now()
//   const msEllapsedSinceValid = nowDate - notBefore
//   return msEllapsedSinceValid
// }

const getCertificateRemainingMs = (forgeCertificate) => {
  const { notAfter } = forgeCertificate.validity
  const nowDate = Date.now()
  const remainingMs = notAfter - nowDate
  return remainingMs
}

const getCertificateValidityDurationInMs = (forgeCertificate) => {
  const { notBefore, notAfter } = forgeCertificate.validity
  const validityDurationInMs = notAfter - notBefore
  return validityDurationInMs
}

const compareRootCertificateAttributes = (
  rootForgeCertificate,
  { rootCertificateCommonName, rootCertificateValidityDurationInMs },
) => {
  const attributeDescription = attributeDescriptionFromAttributeArray(
    rootForgeCertificate.subject.attributes,
  )
  const differences = {}

  const { commonName } = attributeDescription
  if (commonName !== rootCertificateCommonName) {
    differences.rootCertificateCommonName = {
      valueFromCertificate: commonName,
      valueFromParam: rootCertificateCommonName,
    }
  }

  const { notBefore, notAfter } = rootForgeCertificate.validity
  const forgeCertificateValidityDurationInMs = notAfter - notBefore
  // it's certainly too precise, we should approximate to a second? more?
  if (forgeCertificateValidityDurationInMs !== rootCertificateValidityDurationInMs) {
    differences.rootCertificateValidityInYears = {
      valueFromCertificate: forgeCertificateValidityDurationInMs,
      valueFromParam: rootCertificateValidityDurationInMs,
    }
  }

  return differences
}

export const uninstallCertificateAuthority = async ({
  logLevel,
  logger = createLogger({ logLevel }),
  tryToUntrust = false,
} = {}) => {
  const { rootCertificateFileInfo, rootPrivateKeyFileInfo } = getAuthorityFileInfos()

  if (rootCertificateFileInfo.exists) {
    // first untrust the root cert file
    if (tryToUntrust) {
      const rootCertificate = await readFile(rootCertificateFileInfo.url, { as: "string" })
      const { pki } = await importNodeForge()
      const rootForgeCertificate = pki.certificateFromPem(rootCertificate)
      const rootCertificateCommonName = attributeDescriptionFromAttributeArray(
        rootForgeCertificate.subject.attributes,
      ).commonName
      const { removeCertificateAuthority } = await importPlatformMethods()
      await removeCertificateAuthority({
        logger,
        rootCertificate,
        rootCertificateFileUrl: rootCertificateFileInfo.url,
        rootCertificateCommonName,
      })
    }
    // then remove the file
    await removeFileSystemNode(rootCertificateFileInfo.url)
  }

  if (rootPrivateKeyFileInfo.exists) {
    await removeFileSystemNode(rootPrivateKeyFileInfo.url)
  }
}
