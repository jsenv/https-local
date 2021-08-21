import { existsSync } from "node:fs"
import { createDetailedMessage, createLogger } from "@jsenv/logger"
import { urlToFileSystemPath, readFile, writeFile, removeFileSystemNode } from "@jsenv/filesystem"

import { createValidityDurationOfXYears } from "./validity_duration.js"
import { getCertificateAuthorityFileUrls } from "./internal/certificate_authority_file_urls.js"
import { attributeDescriptionFromAttributeArray } from "./internal/certificate_data_converter.js"
import {
  formatExpired,
  formatAboutToExpire,
  formatStillValid,
} from "./internal/validity_formatting.js"
import { importNodeForge } from "./internal/forge.js"
import { createCertificateAuthority } from "./internal/certificate_generator.js"
import { importPlatformMethods } from "./internal/platform.js"

const jsenvParameters = {
  rootCertificateCommonName: "Jsenv localhost root certificate",
  rootCertificateValidityDurationInMs: createValidityDurationOfXYears(20),
}

export const getCertificateAuthorityInfo = async ({
  logLevel,
  logger = createLogger({ logLevel }),
  aboutToExpireRatio = 0.05,
  checkValidity = true,
  checkTrust = true,
} = {}) => {
  const { rootCertificateFile, rootPrivateKeyFile } = getAuthorityFileInfos()

  if (!rootCertificateFile.exists) {
    logger.debug(
      `Authority root certificate file is not on filesystem at ${rootCertificateFile.path}`,
    )
    return null
  }

  if (!rootPrivateKeyFile.exists) {
    logger.debug(
      `Authority root private key file is not on filesystem at ${rootPrivateKeyFile.path}`,
    )
    return null
  }

  logger.debug(
    `Restoring authority from files at ${rootCertificateFile.path} and ${rootPrivateKeyFile.path}`,
  )
  const rootCertificate = await readFile(rootCertificateFile.path, { as: "string" })
  const rootPrivateKey = await readFile(rootPrivateKeyFile.path, { as: "string" })
  const { pki } = await importNodeForge()
  const rootForgeCertificate = pki.certificateFromPem(rootCertificateFile.content)
  const rootForgePrivateKey = pki.privateKeyFromPem(rootPrivateKeyFile.content)

  // test root certificate validity
  let validityStatus
  if (checkValidity) {
    logger.debug(`Checking authority root certificate validity`)
    const validityDurationInMs = getCertificateValidityDurationInMs(rootForgeCertificate)
    const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
    const validityRemainingMsRatio = validityRemainingMs / validityDurationInMs
    validityStatus =
      validityRemainingMs < 0
        ? "expired"
        : validityRemainingMsRatio < aboutToExpireRatio
        ? "about_to_expire"
        : "valid"
    logger.debug(`Authority root certificate validity: ${validityStatus}`)
  }

  let trustInfo
  if (checkTrust) {
    const { getRootCertificateTrustInfo } = await importPlatformMethods()
    trustInfo = await getRootCertificateTrustInfo({
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

const getCertificateValidSinceInMs = (forgeCertificate) => {
  const { notBefore } = forgeCertificate.validity
  const nowDate = Date.now()
  const msEllapsedSinceValid = nowDate - notBefore
  return msEllapsedSinceValid
}

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

export const installCertificateAuthority = async ({
  logLevel,
  logger = createLogger({ logLevel }),

  rootCertificateCommonName = jsenvParameters.rootCertificateCommonName,
  rootCertificateValidityDurationInMs = jsenvParameters.rootCertificateValidityDurationInMs,

  aboutToExpireRatio = 0.05,
}) => {
  const existingCertificateAuthorityInfo = await getCertificateAuthorityInfo({
    logger,
    aboutToExpireRatio,
  })
  const existingCertificateTrustInfo = existingCertificateAuthorityInfo.trustInfo

  const { isNew, rootCertificate, rootCertificateFileUrl } = await requestRootCertificate({
    logger,
    rootCertificateCommonName,
    rootCertificateValidityDurationInMs,
    existingCertificateAuthorityInfo,
  })

  if (isNew) {
    logger.info(`A root certificate was created, it needs to be trusted`)
    const { installRootCertificate } = await importPlatformMethods()
    const trustInfo = await installRootCertificate({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
      rootCertificateCommonName,
      mac: true,
      firefox: true,
    })
    return {
      rootCertificate,
      trustInfo,
    }
  }

  // When trust status is "unknown" it means we don't have a strategy
  // to detect if the root certificate is trusted for a given tool
  // In that case, warn about the remaining unknown status
  const unknownKeys = Object.keys(existingCertificateTrustInfo).filter((key) => {
    return existingCertificateTrustInfo[key].status === "unknown"
  })
  if (unknownKeys.length > 0) {
    // we should not end often into this case, likely if:
    // - a browser NSS file cannot be found
    //   Firefox on mac
    //   Firefox on linux
    //   Chrome on linux
    // - certutil binary was not found and could not be installed on mac/linux

    const reasons = {}
    unknownKeys.forEach((key) => {
      reasons[key] = existingCertificateTrustInfo[key].reason
    })
    logger.warn(
      createDetailedMessage(`Root certificate trust status is unknown for some tools`, {
        reasons,
      }),
    )
  }

  const notTrustedKeys = Object.keys(existingCertificateTrustInfo).filter((key) => {
    return existingCertificateTrustInfo[key].status === "not_trusted"
  })
  if (notTrustedKeys.length) {
    const reasons = {}
    notTrustedKeys.forEach((key) => {
      reasons[key] = existingCertificateTrustInfo[key].reason
    })
    logger.info(
      createDetailedMessage(`Root certificate still not trusted for some tools`, {
        reasons,
      }),
    )

    const { installRootCertificate } = await importPlatformMethods()
    const trustInfo = await installRootCertificate({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
      rootCertificateCommonName,
      // TODO: trust only what is needed
      mac: notTrustedKeys.includes("mac"),
      firefox: notTrustedKeys.includes("firefox"),
      chrome: notTrustedKeys.includes("chrome"),
      safari: notTrustedKeys.includes("safari"),
    })
    return {
      rootCertificate,
      trustInfo: {
        ...existingCertificateTrustInfo,
        ...trustInfo,
      },
    }
  }

  const trustedKeys = Object.keys(existingCertificateTrustInfo).filter((key) => {
    return existingCertificateTrustInfo[key].status === "trusted"
  })
  const reasons = {}
  trustedKeys.forEach((key) => {
    reasons[key] = existingCertificateTrustInfo[key].reason
  })
  logger.info(
    createDetailedMessage(`Root certificate still valid and trusted in tools`, {
      reasons,
    }),
  )
  return {
    rootCertificate,
    trustInfo: existingCertificateTrustInfo,
  }
}

const requestRootCertificate = async ({
  logger,
  rootCertificateCommonName,
  rootCertificateValidityDurationInMs,
  existingCertificateAuthorityInfo,
}) => {
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  const generateAndWriteAuthorityFiles = async () => {
    logger.info(`Generating root certificate`)
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

    return {
      isNew: true,
      rootForgeCertificate: forgeCertificate,
      rootForgePrivateKey: privateKey,
      rootCertificate,
      rootPrivateKey,
      rootCertificateFileUrl,
    }
  }

  if (!existingCertificateAuthorityInfo) {
    return generateAndWriteAuthorityFiles()
  }

  const { rootCertificate, rootForgeCertificate, validityStatus } = existingCertificateAuthorityInfo

  const regenerateRootCertificate = async () => {
    const { uninstallRootCertificate } = await importPlatformMethods()

    await uninstallRootCertificate({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
      rootCertificateCommonName,
    })

    return generateAndWriteAuthorityFiles()
  }

  const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
  if (validityStatus === "about_to_expire") {
    const validityDurationInMs = getCertificateValidityDurationInMs(rootForgeCertificate)
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      formatExpired({
        certificateName: "root certificate",
        msEllapsedSinceExpiration,
        validityDurationInMs,
      }),
    )
    return regenerateRootCertificate()
  }
  if (validityStatus === "expired") {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(rootForgeCertificate)
    logger.info(
      formatAboutToExpire({
        certificateName: "root certificate",
        validityRemainingMs,
        msEllapsedSinceValid,
      }),
    )
    return regenerateRootCertificate()
  }
  logger.debug(
    formatStillValid({
      certificateName: "root certificate",
      validityRemainingMs,
    }),
  )

  // test root certificate attributes are correct
  const rootCertificateDifferences = compareRootCertificateAttributes(rootForgeCertificate, {
    rootCertificateCommonName,
    rootCertificateValidityDurationInMs,
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.debug(`Root certificate attributes are outdated: ${paramNames}`)
    return regenerateRootCertificate()
  }

  // we want a nice log telling how certificate installation went
  // especially the "trusting" part and for how long the certificate
  // will be valid
  logger.debug(`Root certificate reused`)
  return {
    isNew: false,
    rootForgeCertificate,
    rootForgePrivateKey: existingCertificateAuthorityInfo.rootForgePrivateKey,
    rootCertificate: existingCertificateAuthorityInfo.rootCertificate,
    rootPrivateKey: existingCertificateAuthorityInfo.rootPrivateKey,
    rootCertificateFileUrl,
  }
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
    const { uninstallRootCertificate } = await importPlatformMethods()
    await uninstallRootCertificate({
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
