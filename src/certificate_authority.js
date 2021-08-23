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

  aboutToExpireRatio = 0.05,
} = {}) => {
  const existingCertificateAuthorityInfo = await getCertificateAuthorityInfo({
    logger,
    aboutToExpireRatio,
  })
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  const generateRootCertificate = async () => {
    logger.info(`Generating authority certificate...`)
    const { forgeCertificate, privateKey } = await createCertificateAuthority({
      logger,
      commonName: rootCertificateCommonName,
      serialNumber: 0,
    })

    const { pki } = await importNodeForge()
    const rootCertificate = pki.certificateToPem(forgeCertificate)
    const rootPrivateKey = pki.privateKeyToPem(privateKey)
    await writeFile(rootCertificateFileUrl, rootCertificate)
    await writeFile(rootPrivateKeyFileUrl, rootPrivateKey)

    await writeFile(
      certificateAuthorityJsonFileUrl,
      JSON.stringify({ serialNumber: 0 }, null, "  "),
    )

    logger.info(
      `${okSign} authority certificate written at ${urlToFileSystemPath(rootCertificateFileUrl)}`,
    )

    return {
      rootForgeCertificate: forgeCertificate,
      rootForgePrivateKey: privateKey,
      rootCertificate,
      rootPrivateKey,
      rootCertificateFileUrl,
    }
  }

  const generate = async () => {
    const rootCertificateInfo = await generateRootCertificate()
    const { addCertificateAuthority } = await importPlatformMethods()
    const trustInfo = await addCertificateAuthority({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
      rootCertificateCommonName,
      mac: true,
      firefox: true,
    })
    return {
      ...rootCertificateInfo,
      trustInfo,
    }
  }

  const regenerate = async () => {
    const { removeCertificateAuthority } = await importPlatformMethods()
    await removeCertificateAuthority({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
      rootCertificateCommonName,
    })

    return generate()
  }

  if (!existingCertificateAuthorityInfo) {
    return generate()
  }

  const { validityStatus } = existingCertificateAuthorityInfo
  if (validityStatus === "about_to_expire" || validityStatus === "expired") {
    return regenerate()
  }

  logger.info(`Detect if certificate attributes have changed...`)
  const { rootCertificate, rootForgeCertificate } = existingCertificateAuthorityInfo
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

  const rootCertificateInfo = {
    isNew: false,
    rootForgeCertificate,
    rootForgePrivateKey: existingCertificateAuthorityInfo.rootForgePrivateKey,
    rootCertificate: existingCertificateAuthorityInfo.rootCertificate,
    rootPrivateKey: existingCertificateAuthorityInfo.rootPrivateKey,
    rootCertificateFileUrl,
  }

  const { addCertificateAuthority } = await importPlatformMethods()
  const trustInfo = await addCertificateAuthority({
    logger,
    rootCertificate,
    rootCertificateFileUrl,
    rootCertificateCommonName,
    existingCertificateAuthorityInfo,
  })

  return {
    ...rootCertificateInfo,
    trustInfo,
  }
}

const getCertificateAuthorityInfo = async ({
  logLevel,
  logger = createLogger({ logLevel }),
  aboutToExpireRatio = 0.05,
  checkValidity = true,
  checkTrust = true,
} = {}) => {
  logger.info(`Detect existing certificate authority...`)
  const { rootCertificateFile, rootPrivateKeyFile } = getAuthorityFileInfos()

  if (!rootCertificateFile.exists) {
    logger.info(`${infoSign} no certificate authority found`)
    logger.debug(
      `Authority root certificate file is not on filesystem at ${rootCertificateFile.path}`,
    )
    return null
  }

  if (!rootPrivateKeyFile.exists) {
    logger.info(`${infoSign} no certificate authority found`)
    logger.debug(
      `Authority root private key file is not on filesystem at ${rootPrivateKeyFile.path}`,
    )
    return null
  }

  logger.info(`${okSign} found an existing certificate authority`)
  logger.debug(
    `restoring certificate authority from files at ${rootCertificateFile.path} and ${rootPrivateKeyFile.path}...`,
  )
  const rootCertificate = await readFile(rootCertificateFile.path, { as: "string" })
  const rootPrivateKey = await readFile(rootPrivateKeyFile.path, { as: "string" })
  const { pki } = await importNodeForge()
  const rootForgeCertificate = pki.certificateFromPem(rootCertificateFile.content)
  const rootForgePrivateKey = pki.privateKeyFromPem(rootPrivateKeyFile.content)

  // test root certificate validity
  let validityStatus
  if (checkValidity) {
    logger.info(`Checking certificate validity...`)
    const validityDurationInMs = getCertificateValidityDurationInMs(rootForgeCertificate)
    const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
    const validityRemainingMsRatio = validityRemainingMs / validityDurationInMs
    validityStatus =
      validityRemainingMs < 0
        ? "expired"
        : validityRemainingMsRatio < aboutToExpireRatio
        ? "about_to_expire"
        : "valid"
    if (validityStatus === "expired") {
      logger.info(`${infoSign} certificate has expired ${formatTimeDelta(validityRemainingMs)}`)
    } else if (validityStatus === "about_to_expire") {
      logger.info(`${infoSign} certificate will expire in ${formatTimeDelta(validityRemainingMs)}`)
    } else {
      logger.info(`${okSign} certificate is still valid for ${formatDuration(validityRemainingMs)}`)
    }
  }

  let trustInfo
  if (checkTrust) {
    const { getCertificateAuthorityTrustInfo } = await importPlatformMethods()
    trustInfo = await getCertificateAuthorityTrustInfo({
      logger,
      rootCertificate,
      rootCertificateCommonName: attributeDescriptionFromAttributeArray(
        rootForgeCertificate.subject.attributes,
      ).commonName,
    })
  }

  return {
    rootCertificate,
    rootPrivateKey,
    rootForgeCertificate,
    rootForgePrivateKey,
    validityStatus,
    trustInfo,
  }
}

const getAuthorityFileInfos = () => {
  const { rootCertificateFileUrl, rootPrivateKeyFileUrl } = getCertificateAuthorityFileUrls()

  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)
  const rootCertificateFileDetected = existsSync(rootCertificateFilePath)

  const rootPrivateKeyFilePath = urlToFileSystemPath(rootPrivateKeyFileUrl)
  const rootPrivateKeyFileDetected = existsSync(rootPrivateKeyFilePath)

  return {
    rootCertificateFile: {
      url: rootCertificateFileUrl,
      path: rootCertificateFilePath,
      exists: rootCertificateFileDetected,
    },
    rootPrivateKeyFile: {
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
}) => {
  const { rootCertificateFile, rootPrivateKeyFile } = getAuthorityFileInfos()

  if (rootCertificateFile.exists) {
    // first untrust the root cert file
    const rootCertificate = await readFile(rootCertificateFile.url, { as: "string" })
    const { pki } = await importNodeForge()
    const rootForgeCertificate = pki.certificateFromPem(rootCertificate)
    const rootCertificateCommonName = attributeDescriptionFromAttributeArray(
      rootForgeCertificate.subject.attributes,
    ).commonName
    const { removeCertificateAuthority } = await importPlatformMethods()
    await removeCertificateAuthority({
      logger,
      rootCertificate,
      rootCertificateFileUrl: rootCertificateFile.url,
      rootCertificateCommonName,
    })
    // then remove the file
    await removeFileSystemNode(rootCertificateFile.url)
  }

  if (rootPrivateKeyFile.exists) {
    await removeFileSystemNode(rootPrivateKeyFile.url)
  }
}
